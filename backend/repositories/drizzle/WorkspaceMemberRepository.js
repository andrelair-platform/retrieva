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
}

export const workspaceMemberRepository = new WorkspaceMemberRepository();
