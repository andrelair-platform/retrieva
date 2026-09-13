/**
 * Drizzle OrganizationMemberRepository (RTV-49 pt3). Ports the OrganizationMember
 * model's statics (invite-token create/find/activate) to repo methods. Not a
 * per-workspace tenant table (org-scoped), so plain base. Additive; not wired yet.
 */
import { and, eq, sql } from 'drizzle-orm';
import { BaseDrizzleRepository } from './BaseDrizzleRepository.js';
import { organizationMembers } from '../../db/schema/index.js';
import { sha256, generateToken } from '../../utils/security/crypto.js';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class OrganizationMemberRepository extends BaseDrizzleRepository {
  constructor(opts = {}) {
    super(organizationMembers, opts);
  }

  async findActiveByUserId(userId) {
    return this.findOne(
      and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, 'active'))
    );
  }

  async findByOrganization(organizationId, status = 'active') {
    return this.find(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.status, status)
      )
    );
  }

  async revokeMembership(memberId) {
    return this.updateById(memberId, { status: 'revoked' });
  }

  /** Count org admins. NOTE: the enum value is `org_admin` (the Mongoose code queried
   *  'admin', which never matched the ['org_admin','analyst','viewer'] enum → always 0;
   *  corrected here to the real value). */
  async countAdmins(organizationId) {
    return this.count(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.role, 'org_admin'),
        eq(organizationMembers.status, 'active')
      )
    );
  }

  // ── invite tokens (ported from the model statics) ───────────────────────────
  /** Create/refresh an invite (upsert on org+email); returns { member, rawToken }. */
  async createInvite(organizationId, email, role, invitedBy) {
    const rawToken = generateToken(32);
    const values = {
      organizationId,
      email: String(email).toLowerCase(),
      role,
      invitedBy,
      status: 'pending',
      inviteTokenHash: sha256(rawToken),
      inviteTokenExpires: new Date(Date.now() + INVITE_TTL_MS),
    };
    const [member] = await this.db
      .insert(organizationMembers)
      .values(values)
      .onConflictDoUpdate({
        target: [organizationMembers.organizationId, organizationMembers.email],
        set: {
          role: values.role,
          invitedBy: values.invitedBy,
          status: 'pending',
          inviteTokenHash: values.inviteTokenHash,
          inviteTokenExpires: values.inviteTokenExpires,
        },
      })
      .returning();
    return { member, rawToken };
  }

  /** Find a pending, unexpired member by raw invite token. */
  async findByToken(rawToken) {
    return this.findOne(
      and(
        eq(organizationMembers.inviteTokenHash, sha256(rawToken)),
        eq(organizationMembers.status, 'pending'),
        sql`${organizationMembers.inviteTokenExpires} > now()`
      )
    );
  }

  /** Activate: status=active, set userId + joinedAt, clear the token. */
  async activate(memberId, userId) {
    return this.updateById(memberId, {
      status: 'active',
      userId,
      joinedAt: new Date(),
      inviteTokenHash: null,
      inviteTokenExpires: null,
    });
  }
}

export const organizationMemberRepository = new OrganizationMemberRepository();
