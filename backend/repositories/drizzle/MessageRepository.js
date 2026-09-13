/**
 * Drizzle MessageRepository (RTV-49 pt3). Messages are keyed by conversationId (NOT a
 * workspace tenant table — they're isolated transitively via their conversation), so
 * plain base. `content` is encrypted at rest (app-layer): create() encrypts, reads
 * decrypt. Additive; not wired yet.
 */
import { and, eq, gte, lte, asc, desc, sql } from 'drizzle-orm';
import { BaseDrizzleRepository } from './BaseDrizzleRepository.js';
import { messages } from '../../db/schema/index.js';
import { safeEncrypt, safeDecrypt } from '../../utils/security/fieldEncryption.js';
import { escapeRegExp } from '../../utils/core/escapeRegExp.js';

export class MessageRepository extends BaseDrizzleRepository {
  constructor(opts = {}) {
    super(messages, opts);
  }

  _decrypt(row) {
    if (!row) return row;
    return { ...row, content: safeDecrypt(row.content) };
  }

  async create(values) {
    const row = await super.create({ ...values, content: safeEncrypt(values.content) });
    return this._decrypt(row);
  }

  async createMany(values) {
    const rows = await super.createMany(
      (values || []).map((v) => ({ ...v, content: safeEncrypt(v.content) }))
    );
    return rows.map((r) => this._decrypt(r));
  }

  async findByConversation(conversationId, { limit } = {}) {
    const rows = await this.find(eq(messages.conversationId, conversationId), {
      orderBy: asc(messages.timestamp),
      limit,
    });
    return rows.map((r) => this._decrypt(r));
  }

  /** Last N messages, returned oldest→newest (for chat history). */
  async getRecentMessages(conversationId, limit = 20) {
    const rows = await this.find(eq(messages.conversationId, conversationId), {
      orderBy: desc(messages.timestamp),
      limit,
    });
    return rows.reverse().map((r) => this._decrypt(r));
  }

  async getChatHistory(conversationId, limit = 20) {
    const rows = await this.getRecentMessages(conversationId, limit);
    return rows.map((m) => ({ role: m.role, content: m.content }));
  }

  async addUserMessage(conversationId, content) {
    return this.create({ conversationId, role: 'user', content });
  }

  async addAssistantMessage(conversationId, content) {
    return this.create({ conversationId, role: 'assistant', content });
  }

  async addMessagePair(conversationId, userMessage, assistantMessage) {
    // Stagger the timestamps so the user turn deterministically precedes the assistant
    // turn: both rows in a single INSERT would otherwise share the same now() and tie
    // on ordering (Mongo relied on implicit insertion order; SQL needs an explicit key).
    const now = Date.now();
    return this.createMany([
      { conversationId, role: 'user', content: userMessage, timestamp: new Date(now) },
      { conversationId, role: 'assistant', content: assistantMessage, timestamp: new Date(now + 1) },
    ]);
  }

  async deleteByConversation(conversationId) {
    return this.deleteWhere(eq(messages.conversationId, conversationId));
  }

  async countByConversation(conversationId) {
    return this.count(eq(messages.conversationId, conversationId));
  }

  /** { user: n, assistant: n } — replaces the Mongo $group aggregation. */
  async countByRole(conversationId) {
    const rows = await this.db
      .select({ role: messages.role, count: sql`count(*)::int` })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .groupBy(messages.role);
    const counts = { user: 0, assistant: 0 };
    for (const r of rows) counts[r.role] = r.count;
    return counts;
  }

  async searchInConversation(conversationId, searchTerm) {
    // content is encrypted at rest → can't ILIKE in SQL; filter in app after decrypt.
    // (Bounded by conversation size; escape kept for parity/safety.)
    const term = escapeRegExp(String(searchTerm).slice(0, 200)).toLowerCase();
    const rows = await this.findByConversation(conversationId);
    return rows.filter((m) => (m.content || '').toLowerCase().includes(term));
  }

  async findInTimeRange(conversationId, startTime, endTime) {
    const conds = [eq(messages.conversationId, conversationId)];
    if (startTime) conds.push(gte(messages.timestamp, startTime));
    if (endTime) conds.push(lte(messages.timestamp, endTime));
    const rows = await this.find(and(...conds), { orderBy: asc(messages.timestamp) });
    return rows.map((r) => this._decrypt(r));
  }

  async getLastMessage(conversationId) {
    const [row] = await this.find(eq(messages.conversationId, conversationId), {
      orderBy: desc(messages.timestamp),
      limit: 1,
    });
    return row ? this._decrypt(row) : null;
  }

  async getFirstMessage(conversationId) {
    const [row] = await this.find(eq(messages.conversationId, conversationId), {
      orderBy: asc(messages.timestamp),
      limit: 1,
    });
    return row ? this._decrypt(row) : null;
  }
}

export const messageRepository = new MessageRepository();
