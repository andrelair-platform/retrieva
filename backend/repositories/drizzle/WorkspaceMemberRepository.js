/**
 * Drizzle WorkspaceMemberRepository (RTV-49 pt3). Membership join table (workspace↔user).
 * Not auto-tenant-scoped — membership lookups are the thing that ESTABLISHES workspace
 * access (used by middleware before a tenant context exists), so scoping would be
 * circular. Plain base. Additive; not wired yet.
 */
import { and, eq, sql } from 'drizzle-orm';
import { BaseDrizzleRepository } from './BaseDrizzleRepository.js';
import { workspaceMembers } from '../../db/schema/index.js';

export class WorkspaceMemberRepository extends BaseDrizzleRepository {
  constructor(opts = {}) {
    super(workspaceMembers, opts);
  }

  async findMembership(workspaceId, userId) {
    return this.findOne(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.status, 'active')
      )
    );
  }

  async findOwnerMembership(workspaceId, userId) {
    return this.findOne(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.status, 'active'),
        eq(workspaceMembers.role, 'owner')
      )
    );
  }

  /**
   * Active, query-permitted memberships for a user, each WITH its workspace
   * (id, name, syncStatus) — replaces the Mongoose `.populate('workspaceId', …)`
   * used by workspaceAuth. `permissions.canQuery` is a JSONB boolean.
   */
  async findActiveQueryableWithWorkspace(userId) {
    return this.db.query.workspaceMembers.findMany({
      where: and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.status, 'active'),
        sql`(${workspaceMembers.permissions} ->> 'canQuery')::boolean = true`
      ),
      with: { workspace: { columns: { id: true, name: true, syncStatus: true } } },
    });
  }

  async findActiveByUserId(userId) {
    return this.find(
      and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.status, 'active'))
    );
  }

  async findByWorkspace(workspaceId, status = 'active') {
    return this.find(
      and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.status, status))
    );
  }

  async deleteByWorkspace(workspaceId) {
    return this.deleteWhere(eq(workspaceMembers.workspaceId, workspaceId));
  }

  /** Add the creating user as owner (ported from the model static). */
  async addOwner(workspaceId, userId) {
    return this.create({
      workspaceId,
      userId,
      role: 'owner',
      status: 'active',
      permissions: { canQuery: true, canViewSources: true, canInvite: true },
    });
  }

  /**
   * Invite a user: reactivate a revoked membership, reject an already-active one,
   * else create. Ported from the WorkspaceMember.inviteMember static.
   */
  async inviteMember(workspaceId, userId, invitedBy, role = 'member') {
    const existing = await this.findOne(
      and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId))
    );
    if (existing) {
      if (existing.status === 'revoked') {
        return this.updateById(existing.id, {
          status: 'active',
          role,
          invitedBy,
          invitedAt: new Date(),
        });
      }
      throw new Error('User is already a member of this workspace');
    }
    return this.create({
      workspaceId,
      userId,
      role,
      invitedBy,
      status: 'active',
      permissions: { canQuery: true, canViewSources: true, canInvite: role === 'owner' },
    });
  }

  /** All active memberships for a user WITH their workspace (replaces getUserWorkspaces). */
  async findActiveWithWorkspace(userId) {
    return this.db.query.workspaceMembers.findMany({
      where: and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.status, 'active')),
      with: { workspace: true },
    });
  }

  /** Non-revoked members of a workspace WITH the user (replaces getWorkspaceMembers). */
  async findByWorkspaceWithUser(workspaceId) {
    return this.db.query.workspaceMembers.findMany({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        sql`${workspaceMembers.status} <> 'revoked'`
      ),
      with: { user: { columns: { id: true, name: true, email: true } } },
    });
  }

  /** Active owners of a workspace WITH the user (email/name/notificationPreferences). */
  async findOwnersWithUser(workspaceId) {
    return this.db.query.workspaceMembers.findMany({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.role, 'owner'),
        eq(workspaceMembers.status, 'active')
      ),
      with: {
        user: { columns: { id: true, name: true, email: true, notificationPreferences: true } },
      },
    });
  }

  /**
   * Group active owners by user → their workspace ids (replaces the $group aggregation
   * in the weekly digest). Returns [{ userId, workspaceIds: [] }].
   */
  async groupOwnerWorkspaces() {
    const rows = await this.db
      .select({
        userId: workspaceMembers.userId,
        workspaceIds: sql`array_agg(${workspaceMembers.workspaceId})`,
      })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.role, 'owner'), eq(workspaceMembers.status, 'active')))
      .groupBy(workspaceMembers.userId);
    return rows.map((r) => ({ userId: r.userId, workspaceIds: r.workspaceIds || [] }));
  }
}

export const workspaceMemberRepository = new WorkspaceMemberRepository();
