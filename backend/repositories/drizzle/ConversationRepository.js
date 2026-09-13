/**
 * Drizzle ConversationRepository (RTV-49 pt4). Tenant-scoped (workspaceId) — extends
 * TenantScopedRepository so every read/write is AND-ed with the active workspace and
 * create() stamps it (faithful to the old Mongoose tenantIsolation plugin, which scoped
 * whenever a tenant context was present; now fail-closed). `title` is NOT encrypted, so
 * search is a SQL ILIKE. Additive; not wired yet.
 */
import { and, eq, gte, ilike, sql, desc } from 'drizzle-orm';
import { TenantScopedRepository } from './TenantScopedRepository.js';
import { conversations } from '../../db/schema/index.js';
import { escapeRegExp } from '../../utils/core/escapeRegExp.js';

export class ConversationRepository extends TenantScopedRepository {
  constructor(opts = {}) {
    super(conversations, { tenantKey: 'workspaceId', ...opts });
  }

  /** create() (base) stamps workspace_id from context — don't pass it here. */
  async createConversation({ title, userId } = {}) {
    return this.create({ title: title || 'New Conversation', userId: userId ?? null });
  }

  async findByUser(userId, { limit } = {}) {
    return this.find(eq(conversations.userId, userId), {
      orderBy: desc(conversations.updatedAt),
      limit,
    });
  }

  async findByUserPaginated(userId, { page = 1, limit = 20 } = {}) {
    return this.findPaginated(eq(conversations.userId, userId), {
      page,
      limit,
      orderBy: desc(conversations.updatedAt),
    });
  }

  async updateTitle(id, title) {
    return this.updateById(id, { title: String(title).trim() });
  }

  /** messageCount += count, lastMessageAt = now — tenant+id scoped. */
  async incrementMessageCount(id, count = 1) {
    const [row] = await this.updateWhere(eq(conversations.id, id), {
      messageCount: sql`${conversations.messageCount} + ${count}`,
      lastMessageAt: new Date(),
    });
    return row ?? null;
  }

  async touchLastMessage(id) {
    return this.updateById(id, { lastMessageAt: new Date() });
  }

  async getRecentConversations(userId, limit = 10) {
    return this.find(eq(conversations.userId, userId), {
      orderBy: desc(conversations.updatedAt),
      limit,
    });
  }

  async searchByTitle(userId, searchTerm) {
    const term = escapeRegExp(String(searchTerm).slice(0, 200));
    return this.find(
      and(eq(conversations.userId, userId), ilike(conversations.title, `%${term}%`)),
      {
        orderBy: desc(conversations.updatedAt),
      }
    );
  }

  async getActiveConversations(userId, daysActive = 7) {
    const cutoff = new Date(Date.now() - daysActive * 24 * 60 * 60 * 1000);
    return this.find(
      and(eq(conversations.userId, userId), gte(conversations.lastMessageAt, cutoff)),
      {
        orderBy: desc(conversations.lastMessageAt),
      }
    );
  }

  async deleteConversation(id) {
    return this.deleteById(id);
  }

  async deleteUserConversations(userId) {
    return this.deleteWhere(eq(conversations.userId, userId));
  }

  async countByUser(userId) {
    return this.count(eq(conversations.userId, userId));
  }

  async getEmptyConversations(userId) {
    return this.find(and(eq(conversations.userId, userId), eq(conversations.messageCount, 0)), {
      orderBy: desc(conversations.createdAt),
    });
  }

  async cleanupEmptyConversations(userId, daysOld = 7) {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    return this.deleteWhere(
      and(
        eq(conversations.userId, userId),
        eq(conversations.messageCount, 0),
        sql`${conversations.createdAt} < ${cutoff}`
      )
    );
  }

  /** Per-user stats (tenant-scoped) — replaces the Mongo $group aggregation. */
  async getUserStats(userId) {
    const [r] = await this.db
      .select({
        totalConversations: sql`count(*)::int`,
        totalMessages: sql`coalesce(sum(${conversations.messageCount}), 0)::int`,
        avgMessagesPerConversation: sql`coalesce(avg(${conversations.messageCount}), 0)::float`,
        oldestConversation: sql`min(${conversations.createdAt})`,
        newestConversation: sql`max(${conversations.createdAt})`,
      })
      .from(conversations)
      .where(this._scoped(eq(conversations.userId, userId)));
    return (
      r ?? {
        totalConversations: 0,
        totalMessages: 0,
        avgMessagesPerConversation: 0,
        oldestConversation: null,
        newestConversation: null,
      }
    );
  }
}

export const conversationRepository = new ConversationRepository();
