import { and, eq, inArray, isNull, desc } from 'drizzle-orm';
import { AppError } from '../utils/index.js';
import { verifyOwnership } from '../utils/index.js';
import { conversationRepository } from '../repositories/index.js';
import { messageRepository } from '../repositories/index.js';
import { workspaceMemberRepository } from '../repositories/index.js';
import { conversations, messages } from '../db/schema/index.js';
import { ragService } from './rag.js';
import logger from '../config/logger.js';

// Conversations authorise by USER (verifyOwnership), not by the active workspace, so this
// service uses the repo's explicit unscoped ops + userId filters (RTV-49). workspaceId is a
// nullable uuid FK now — the legacy 'default' string maps to null.
class ConversationService {
  constructor(deps = {}) {
    this.conversationRepo = deps.conversationRepo || conversationRepository;
    this.messageRepo = deps.messageRepo || messageRepository;
    this.workspaceMemberRepo = deps.workspaceMemberRepo || workspaceMemberRepository;
    this.ragService = deps.ragService || ragService;
    this.logger = deps.logger || logger;
  }

  async getUserPrimaryWorkspace(userId) {
    const membership = await this.workspaceMemberRepo.findActiveByUserId(userId);
    return membership?.workspaceId?.toString() || null;
  }

  async createConversation({ userId, title, workspaceId, idempotencyKey }) {
    let resolvedWorkspaceId = workspaceId;
    if (!resolvedWorkspaceId) {
      resolvedWorkspaceId = await this.getUserPrimaryWorkspace(userId);
      if (resolvedWorkspaceId) {
        this.logger.info('Auto-assigned user workspace', {
          service: 'conversation',
          userId,
          workspaceId: resolvedWorkspaceId,
        });
      }
    }

    const values = {
      title: title || 'New Conversation',
      userId,
      workspaceId: resolvedWorkspaceId || null, // 'default'/absent → NULL (nullable FK)
    };

    if (idempotencyKey) {
      // Idempotent: return the existing conversation for (user, workspace, key) if present.
      const existing = await this.conversationRepo.findUnscoped(
        and(
          eq(conversations.userId, userId),
          resolvedWorkspaceId
            ? eq(conversations.workspaceId, resolvedWorkspaceId)
            : isNull(conversations.workspaceId),
          eq(conversations.idempotencyKey, idempotencyKey)
        )
      );
      if (existing[0]) {
        this.logger.info('Returning existing conversation (idempotent request)', {
          service: 'conversation',
          conversationId: existing[0].id,
          idempotencyKey,
        });
        return { conversation: existing[0], wasCreated: false };
      }
      const conversation = await this.conversationRepo.createUnscoped({ ...values, idempotencyKey });
      return { conversation, wasCreated: true };
    }

    const conversation = await this.conversationRepo.createUnscoped(values);
    return { conversation, wasCreated: true };
  }

  async listConversations(userId, { workspaceId, limit, skip }) {
    const where = workspaceId
      ? and(eq(conversations.userId, userId), eq(conversations.workspaceId, workspaceId))
      : eq(conversations.userId, userId);

    const [rows, total] = await Promise.all([
      this.conversationRepo.findUnscoped(where, {
        orderBy: desc(conversations.updatedAt),
        limit,
        offset: skip,
      }),
      this.conversationRepo.countUnscoped(where),
    ]);

    return { conversations: rows, total };
  }

  async getConversation(id, userId, { limit, skip }) {
    const conversation = await this.conversationRepo.findByIdUnscoped(id);
    if (!conversation) throw new AppError('Conversation not found', 404);

    if (!verifyOwnership(conversation.userId, userId)) {
      this.logger.warn('Unauthorized conversation access attempt', {
        service: 'conversation',
        conversationId: id,
        requestUserId: userId,
        ownerUserId: conversation.userId,
      });
      throw new AppError('Access denied', 403);
    }

    const [msgs, totalMessages] = await Promise.all([
      this.messageRepo.findByConversation(id, { limit, offset: skip }),
      this.messageRepo.count(eq(messages.conversationId, id)),
    ]);

    return { conversation, messages: msgs, totalMessages };
  }

  async askQuestion(id, userId, { question, filters, authorizedWorkspaceIds = null }) {
    if (!question || question.trim().length === 0) {
      throw new AppError('Question is required', 400);
    }
    if (question.length > 5000) {
      throw new AppError('Question is too long (max 5000 characters)', 400);
    }

    const conversation = await this.conversationRepo.findByIdUnscoped(id);
    if (!conversation) throw new AppError('Conversation not found', 404);
    if (!verifyOwnership(conversation.userId, userId)) {
      throw new AppError('Access denied', 403);
    }

    this.logger.info('Processing question in conversation', {
      service: 'conversation',
      conversationId: id,
      questionLength: question.length,
      filters: filters || 'none',
    });

    return this.ragService.askWithConversation(question, {
      conversationId: id,
      filters: filters || null,
      userId,
      authorizedWorkspaceIds,
    });
  }

  async updateConversation(id, userId, { title }) {
    if (!title || title.trim().length === 0) {
      throw new AppError('Title is required', 400);
    }

    const existing = await this.conversationRepo.findByIdUnscoped(id);
    if (!existing) throw new AppError('Conversation not found', 404);
    if (!verifyOwnership(existing.userId, userId)) {
      throw new AppError('Access denied', 403);
    }

    const conversation = await this.conversationRepo.updateByIdUnscoped(id, { title: title.trim() });
    if (!conversation) throw new AppError('Conversation not found', 404);
    return conversation;
  }

  async deleteConversation(id, userId) {
    const conversation = await this.conversationRepo.findByIdUnscoped(id);
    if (!conversation) throw new AppError('Conversation not found', 404);
    if (!verifyOwnership(conversation.userId, userId)) {
      throw new AppError('Access denied', 403);
    }

    // messages cascade via FK, but delete explicitly for parity + clarity.
    await this.messageRepo.deleteWhere(eq(messages.conversationId, id));
    await this.conversationRepo.deleteByIdUnscoped(id);

    this.logger.info('Deleted conversation and all messages', {
      service: 'conversation',
      conversationId: id,
    });
  }

  async bulkDelete(ids, userId) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new AppError('ids array is required', 400);
    }
    if (ids.length > 100) {
      throw new AppError('Cannot delete more than 100 conversations at once', 400);
    }

    const rows = await this.conversationRepo.findUnscoped(
      and(inArray(conversations.id, ids), eq(conversations.userId, userId))
    );

    if (rows.length === 0) {
      throw new AppError('No conversations found', 404);
    }

    const validIds = rows.map((c) => c.id);
    const invalidCount = ids.length - validIds.length;

    await this.messageRepo.deleteWhere(inArray(messages.conversationId, validIds));
    const deleted = await this.conversationRepo.deleteWhere(inArray(conversations.id, validIds));

    this.logger.info('Bulk deleted conversations', {
      service: 'conversation',
      requestedCount: ids.length,
      deletedCount: deleted.length,
      invalidCount,
      userId,
    });

    return {
      deletedCount: deleted.length,
      deletedIds: validIds,
      invalidCount,
    };
  }
}

export const conversationService = new ConversationService();
export { ConversationService };
