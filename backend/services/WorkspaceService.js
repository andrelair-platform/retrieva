import { AppError } from '../utils/index.js';
import { workspaceRepository } from '../repositories/drizzle/WorkspaceRepository.js';
import { workspaceMemberRepository } from '../repositories/drizzle/WorkspaceMemberRepository.js';
import { organizationMemberRepository } from '../repositories/drizzle/OrganizationMemberRepository.js';
import { userRepository } from '../repositories/drizzle/UserRepository.js';
import { assessmentRepository } from '../repositories/drizzle/AssessmentRepository.js';
import { deleteAssessmentCollection } from './fileIngestionService.js';
import { safeDecrypt } from '../utils/security/fieldEncryption.js';
import * as storageModule from '../config/storage.js';
import logger from '../config/logger.js';
import { emailService } from './emailService.js';

export function serializeWorkspace(ws, extras = {}) {
  return {
    id: ws.id.toString(),
    name: ws.name,
    description: ws.description,
    syncStatus: ws.syncStatus,
    vendorTier: ws.vendorTier,
    serviceType: ws.serviceType,
    country: ws.country,
    contractStart: ws.contractStart,
    contractEnd: ws.contractEnd,
    nextReviewDate: ws.nextReviewDate,
    vendorStatus: ws.vendorStatus,
    certifications: ws.certifications,
    vendorFunctions: ws.vendorFunctions,
    exitStrategyDoc: ws.exitStrategyDoc,
    createdAt: ws.createdAt,
    updatedAt: ws.updatedAt,
    ...extras,
  };
}

class WorkspaceService {
  constructor(deps = {}) {
    this.workspaceRepo = deps.workspaceRepo || workspaceRepository;
    this.memberRepo = deps.memberRepo || workspaceMemberRepository;
    this.orgMemberRepo = deps.orgMemberRepo || organizationMemberRepository;
    this.userRepo = deps.userRepo || userRepository;
    this.assessmentRepo = deps.assessmentRepo || assessmentRepository;
    this.deleteAssessmentCollection = deps.deleteAssessmentCollection || deleteAssessmentCollection;
    this.storage = deps.storage || storageModule;
    this.logger = deps.logger || logger;
    this.emailService = deps.emailService || emailService;
  }

  async createWorkspace(userId, data) {
    const {
      name,
      description,
      vendorTier,
      serviceType,
      country,
      contractStart,
      contractEnd,
      vendorFunctions,
    } = data;

    const orgMembership = await this.orgMemberRepo.findActiveByUserId(userId);

    const workspace = await this.workspaceRepo.create({
      name: name.trim(),
      description: description?.trim() || '',
      userId,
      organizationId: orgMembership?.organizationId || null,
      vendorTier: vendorTier || null,
      serviceType: serviceType || null,
      country: country?.trim() || '',
      contractStart: contractStart ? new Date(contractStart) : null,
      contractEnd: contractEnd ? new Date(contractEnd) : null,
      vendorFunctions: Array.isArray(vendorFunctions) ? vendorFunctions : [],
    });

    await this.memberRepo.addOwner(workspace.id, userId);

    // Flip the onboarding flag (fire-and-forget, idempotent merge).
    this.userRepo
      .updateOnboarding(userId, { checklist: { vendorCreated: true } })
      .catch(() => {});

    this.logger.info('Workspace created', {
      service: 'workspace',
      workspaceId: workspace.id,
      userId,
    });

    return serializeWorkspace(workspace);
  }

  async getWorkspace(workspaceId, userId) {
    const membership = await this.memberRepo.findMembership(workspaceId, userId);
    if (!membership) throw new AppError('You are not a member of this workspace', 403);

    const workspace = await this.workspaceRepo.findById(workspaceId);
    if (!workspace) throw new AppError('Workspace not found', 404);

    return serializeWorkspace(workspace, {
      myRole: membership.role,
      permissions: membership.permissions,
    });
  }

  async updateWorkspace(workspaceId, userId, data) {
    const membership = await this.memberRepo.findOwnerMembership(workspaceId, userId);
    if (!membership) throw new AppError('Only workspace owners can update workspace details', 403);

    const workspace = await this.workspaceRepo.findById(workspaceId);
    if (!workspace) throw new AppError('Workspace not found', 404);

    const {
      name,
      description,
      vendorTier,
      country,
      serviceType,
      contractStart,
      contractEnd,
      nextReviewDate,
      vendorStatus,
      certifications,
      exitStrategyDoc,
      vendorFunctions,
    } = data;

    const patch = {};
    if (name?.trim()) patch.name = name.trim();
    if (description !== undefined) patch.description = description?.trim() || '';
    if (vendorTier !== undefined) patch.vendorTier = vendorTier || null;
    if (country !== undefined) patch.country = country?.trim() || '';
    if (serviceType !== undefined) patch.serviceType = serviceType || null;
    if (contractStart !== undefined)
      patch.contractStart = contractStart ? new Date(contractStart) : null;
    if (contractEnd !== undefined) patch.contractEnd = contractEnd ? new Date(contractEnd) : null;
    if (nextReviewDate !== undefined)
      patch.nextReviewDate = nextReviewDate ? new Date(nextReviewDate) : null;
    if (vendorStatus !== undefined) patch.vendorStatus = vendorStatus;
    if (Array.isArray(certifications)) patch.certifications = certifications;
    if (Array.isArray(vendorFunctions)) patch.vendorFunctions = vendorFunctions;
    if (exitStrategyDoc !== undefined) patch.exitStrategyDoc = exitStrategyDoc || null;

    const updated =
      Object.keys(patch).length > 0
        ? await this.workspaceRepo.updateById(workspaceId, patch)
        : workspace;

    return serializeWorkspace(updated);
  }

  async deleteWorkspace(workspaceId, userId) {
    const membership = await this.memberRepo.findOwnerMembership(workspaceId, userId);
    if (!membership) throw new AppError('Only workspace owners can delete a workspace', 403);

    // Purge external data (Qdrant/files) BEFORE deleting the workspace row; the DB
    // FKs then cascade-delete members/conversations/messages/questionnaires/assessments.
    await this._purgeWorkspaceData(workspaceId);

    await this.workspaceRepo.deleteById(workspaceId); // cascade removes child rows

    this.logger.info('Workspace deleted', { service: 'workspace', workspaceId });
  }

  /**
   * Erase external data tied to a workspace (#417 — GDPR erasure / clean offboarding):
   * Qdrant chunks/collections + stored files. The Postgres rows are removed by FK cascade
   * when the workspace is deleted. Best-effort; each step isolated.
   */
  async _purgeWorkspaceData(workspaceId) {
    const wid = String(workspaceId);

    // Gather assessments (unscoped — explicit workspace) for their ids + file keys.
    let assessments = [];
    try {
      const res = await this.assessmentRepo.findByWorkspaces([wid], { limit: 10000 });
      assessments = res.assessments;
    } catch (err) {
      this.logger.warn('Purge: failed to list assessments', {
        workspaceId: wid,
        error: err.message,
      });
    }

    // 1. Qdrant: purge the workspace's chunks from the shared collection.
    try {
      const { deleteWorkspaceChunks } = await import('../config/vectorStore.js');
      await deleteWorkspaceChunks(wid);
    } catch (err) {
      this.logger.warn('Purge: failed to delete workspace vectors', {
        workspaceId: wid,
        error: err.message,
      });
    }

    // 2. Qdrant per-assessment collections + 3. stored files.
    for (const a of assessments) {
      try {
        await this.deleteAssessmentCollection(String(a.id));
      } catch (err) {
        this.logger.warn('Purge: failed to delete assessment collection', {
          assessmentId: String(a.id),
          error: err.message,
        });
      }
      for (const doc of a.documents || []) {
        if (!doc?.storageKey) continue;
        try {
          await this.storage.deleteFile(doc.storageKey);
        } catch (err) {
          this.logger.warn('Purge: failed to delete file', {
            key: doc.storageKey,
            error: err.message,
          });
        }
      }
    }

    this.logger.info('Workspace data purged', {
      service: 'workspace',
      workspaceId: wid,
      assessments: assessments.length,
    });
  }

  async getMyWorkspaces(userId) {
    const orgMembership = await this.orgMemberRepo.findActiveByUserId(userId);

    if (orgMembership) {
      const orgWorkspaces = await this.workspaceRepo.findByOrganization(
        orgMembership.organizationId
      );
      const roleMap = { org_admin: 'owner', analyst: 'member', viewer: 'viewer' };
      const myRole = roleMap[orgMembership.role] || 'member';
      const canInvite = orgMembership.role === 'org_admin';
      return orgWorkspaces.map((ws) =>
        serializeWorkspace(ws, {
          myRole,
          permissions: { canQuery: true, canViewSources: true, canInvite },
          joinedAt: orgMembership.joinedAt,
        })
      );
    }

    const memberships = await this.memberRepo.findActiveWithWorkspace(userId);
    return memberships
      .filter((m) => m.workspace)
      .map((m) =>
        serializeWorkspace(m.workspace, {
          myRole: m.role,
          permissions: m.permissions,
          joinedAt: m.invitedAt,
        })
      );
  }

  async getWorkspaceMembers(workspaceId, userId) {
    const requesterMembership = await this.memberRepo.findMembership(workspaceId, userId);
    if (!requesterMembership) throw new AppError('You are not a member of this workspace', 403);

    const members = await this.memberRepo.findByWorkspaceWithUser(workspaceId);
    return members.map((m) => ({
      id: m.id.toString(),
      userId: m.user?.id?.toString(),
      user: m.user
        ? { id: m.user.id.toString(), name: safeDecrypt(m.user.name), email: m.user.email }
        : null,
      role: m.role,
      status: m.status,
      permissions: m.permissions,
      joinedAt: m.invitedAt,
    }));
  }

  async inviteMember(workspaceId, inviterId, { email, role = 'member' }) {
    const userToInvite = await this.userRepo.findByEmail(email);
    if (!userToInvite) throw new AppError('User not found. They must register first.', 404);

    const inviterMembership = await this.memberRepo.findMembership(workspaceId, inviterId);
    if (!inviterMembership) throw new AppError('You are not a member of this workspace', 403);

    if (inviterMembership.role !== 'owner' && !inviterMembership.permissions?.canInvite) {
      throw new AppError('You do not have permission to invite members', 403);
    }

    const workspace = await this.workspaceRepo.findById(workspaceId);
    if (!workspace) throw new AppError('Workspace not found', 404);

    let membership;
    try {
      membership = await this.memberRepo.inviteMember(workspaceId, userToInvite.id, inviterId, role);
    } catch (err) {
      if (err.message.includes('already a member')) {
        throw new AppError('User is already a member of this workspace', 409);
      }
      throw err;
    }

    const inviter = await this.userRepo.findById(inviterId);

    this.logger.info('User invited to workspace', {
      service: 'workspace-member',
      workspaceId,
      invitedUserId: userToInvite.id,
      invitedBy: inviterId,
      role,
    });

    this.emailService
      .sendWorkspaceInvitation({
        toEmail: userToInvite.email,
        toName: userToInvite.name,
        inviterName: inviter?.name || inviter?.email || 'A team member',
        workspaceName: workspace.name,
        workspaceId: workspace.id.toString(),
        role,
      })
      .catch((err) => {
        this.logger.error('Invitation email error', {
          service: 'workspace-member',
          error: err.message,
        });
      });

    return {
      membership: {
        id: membership.id,
        userId: userToInvite.id,
        email: userToInvite.email,
        name: userToInvite.name,
        role: membership.role,
        status: membership.status,
      },
      inviteeName: userToInvite.name || email,
      workspaceName: workspace.name,
    };
  }

  async revokeMember(workspaceId, requesterId, memberId) {
    const requesterMembership = await this.memberRepo.findOwnerMembership(workspaceId, requesterId);
    if (!requesterMembership) throw new AppError('Only workspace owners can revoke access', 403);

    const memberToRevoke = await this.memberRepo.findById(memberId);
    if (!memberToRevoke || String(memberToRevoke.workspaceId) !== String(workspaceId)) {
      throw new AppError('Member not found', 404);
    }
    if (memberToRevoke.role === 'owner') throw new AppError('Cannot revoke owner access', 400);

    await this.memberRepo.updateById(memberId, { status: 'revoked' });

    this.logger.info('User access revoked from workspace', {
      service: 'workspace-member',
      workspaceId,
      revokedUserId: memberToRevoke.userId,
      revokedBy: requesterId,
    });
  }

  async updateMember(workspaceId, requesterId, memberId, { role, permissions } = {}) {
    const requesterMembership = await this.memberRepo.findOwnerMembership(workspaceId, requesterId);
    if (!requesterMembership)
      throw new AppError('Only workspace owners can update member permissions', 403);

    const member = await this.memberRepo.findById(memberId);
    if (!member || String(member.workspaceId) !== String(workspaceId)) {
      throw new AppError('Member not found', 404);
    }
    if (member.role === 'owner') throw new AppError('Cannot modify owner permissions', 400);

    const patch = {};
    const nextRole = role && ['member', 'viewer'].includes(role) ? role : member.role;
    if (role && ['member', 'viewer'].includes(role)) patch.role = role;

    if (permissions) {
      patch.permissions = {
        ...member.permissions,
        ...permissions,
        canInvite: permissions.canInvite === true && nextRole !== 'viewer',
      };
    }

    const updated =
      Object.keys(patch).length > 0 ? await this.memberRepo.updateById(memberId, patch) : member;

    this.logger.info('Member permissions updated', {
      service: 'workspace-member',
      workspaceId,
      memberId,
      updatedBy: requesterId,
    });

    return updated;
  }
}

export const workspaceService = new WorkspaceService();
export { WorkspaceService };
