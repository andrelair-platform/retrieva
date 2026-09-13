/**
 * Unit Tests for Workspace Auth Middleware
 *
 * Tests the workspace authorization middleware functions.
 * RTV-49: migrated off Mongoose models → Drizzle repositories.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies before importing
vi.mock('../../config/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../repositories/drizzle/WorkspaceMemberRepository.js', () => ({
  workspaceMemberRepository: {
    findActiveQueryableWithWorkspace: vi.fn(),
    findOwnerMembership: vi.fn(),
    findMembership: vi.fn(),
  },
}));

vi.mock('../../repositories/drizzle/WorkspaceRepository.js', () => ({
  workspaceRepository: {
    findById: vi.fn(),
  },
}));

import {
  requireWorkspaceAccess,
  requireWorkspaceOwner,
  canInviteMembers,
  getUserWorkspaceIds,
} from '../../middleware/workspaceAuth.js';
import { workspaceMemberRepository } from '../../repositories/drizzle/WorkspaceMemberRepository.js';
import { workspaceRepository } from '../../repositories/drizzle/WorkspaceRepository.js';

describe('Workspace Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      path: '/test',
      ip: '127.0.0.1',
      params: {},
      body: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    mockNext = vi.fn();
  });

  // ============================================================================
  // requireWorkspaceAccess tests
  // ============================================================================
  describe('requireWorkspaceAccess', () => {
    it('should return 401 when no user authenticated', async () => {
      mockReq.user = null;

      await requireWorkspaceAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Authentication required'),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user has no workspace memberships', async () => {
      mockReq.user = { userId: 'user-123' };

      workspaceMemberRepository.findActiveQueryableWithWorkspace.mockResolvedValue([]);

      await requireWorkspaceAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('do not have access'),
        })
      );
    });

    it('should return 403 when all workspaces are in error state', async () => {
      mockReq.user = { userId: 'user-123' };

      workspaceMemberRepository.findActiveQueryableWithWorkspace.mockResolvedValue([
        {
          workspace: { id: 'ws-1', syncStatus: 'error' },
          role: 'member',
          permissions: { canQuery: true },
        },
      ]);

      await requireWorkspaceAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('No active workspaces'),
        })
      );
    });

    it('should attach authorized workspaces and call next on success', async () => {
      mockReq.user = { userId: 'user-123' };

      workspaceMemberRepository.findActiveQueryableWithWorkspace.mockResolvedValue([
        {
          workspace: {
            id: { toString: () => 'ws-1' },
            name: 'Test Workspace',
            syncStatus: 'synced',
          },
          role: 'member',
          permissions: { canQuery: true },
        },
      ]);

      await requireWorkspaceAccess(mockReq, mockRes, mockNext);

      expect(mockReq.authorizedWorkspaces).toHaveLength(1);
      expect(mockReq.authorizedWorkspaces[0]).toMatchObject({
        workspaceId: 'ws-1',
        workspaceName: 'Test Workspace',
        role: 'member',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('rejects 403 when X-Workspace-Id is not a workspace the user belongs to', async () => {
      mockReq.user = { userId: 'user-123' };
      mockReq.headers = { 'x-workspace-id': 'ws-B' }; // attacker requests another workspace

      workspaceMemberRepository.findActiveQueryableWithWorkspace.mockResolvedValue([
        {
          workspace: { id: { toString: () => 'ws-A' }, name: 'My WS', syncStatus: 'synced' },
          role: 'member',
          permissions: { canQuery: true },
        },
      ]);

      await requireWorkspaceAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('access to this workspace') })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('allows when X-Workspace-Id matches one of the user memberships', async () => {
      mockReq.user = { userId: 'user-123' };
      mockReq.headers = { 'x-workspace-id': 'ws-A' };

      workspaceMemberRepository.findActiveQueryableWithWorkspace.mockResolvedValue([
        {
          workspace: { id: { toString: () => 'ws-A' }, name: 'My WS', syncStatus: 'synced' },
          role: 'member',
          permissions: { canQuery: true },
        },
      ]);

      await requireWorkspaceAccess(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalledWith(403);
    });

    it('should filter out null workspace references', async () => {
      mockReq.user = { userId: 'user-123' };

      workspaceMemberRepository.findActiveQueryableWithWorkspace.mockResolvedValue([
        {
          workspace: null, // Deleted workspace
          role: 'member',
        },
        {
          workspace: {
            id: { toString: () => 'ws-2' },
            name: 'Valid Workspace',
            syncStatus: 'synced',
          },
          role: 'member',
          permissions: { canQuery: true },
        },
      ]);

      await requireWorkspaceAccess(mockReq, mockRes, mockNext);

      expect(mockReq.authorizedWorkspaces).toHaveLength(1);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 500 on unexpected error', async () => {
      mockReq.user = { userId: 'user-123' };

      workspaceMemberRepository.findActiveQueryableWithWorkspace.mockRejectedValue(
        new Error('Database error')
      );

      await requireWorkspaceAccess(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authorization check failed',
        })
      );
    });
  });

  // ============================================================================
  // requireWorkspaceOwner tests
  // ============================================================================
  describe('requireWorkspaceOwner', () => {
    it('should return 401 when no user authenticated', async () => {
      mockReq.user = null;

      await requireWorkspaceOwner(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when no workspace ID provided', async () => {
      mockReq.user = { userId: 'user-123' };
      mockReq.params = {};
      mockReq.body = {};

      await requireWorkspaceOwner(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Workspace ID required',
        })
      );
    });

    it('should return 403 when user is not owner', async () => {
      mockReq.user = { userId: 'user-123' };
      mockReq.params = { workspaceId: 'ws-1' };

      workspaceMemberRepository.findOwnerMembership.mockResolvedValue(null);

      await requireWorkspaceOwner(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Only workspace owners'),
        })
      );
    });

    it('should call next when user is owner', async () => {
      mockReq.user = { userId: 'user-123' };
      mockReq.params = { workspaceId: 'ws-1' };

      workspaceMemberRepository.findOwnerMembership.mockResolvedValue({
        userId: 'user-123',
        workspaceId: 'ws-1',
        role: 'owner',
        status: 'active',
      });

      const mockWorkspace = { id: 'ws-1', name: 'Test' };
      workspaceRepository.findById.mockResolvedValue(mockWorkspace);

      await requireWorkspaceOwner(mockReq, mockRes, mockNext);

      expect(mockReq.workspace).toEqual(mockWorkspace);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should get workspace ID from body if not in params', async () => {
      mockReq.user = { userId: 'user-123' };
      mockReq.params = {};
      mockReq.body = { workspaceId: 'ws-1' };

      workspaceMemberRepository.findOwnerMembership.mockResolvedValue({
        userId: 'user-123',
        workspaceId: 'ws-1',
        role: 'owner',
        status: 'active',
      });

      workspaceRepository.findById.mockResolvedValue({ id: 'ws-1' });

      await requireWorkspaceOwner(mockReq, mockRes, mockNext);

      expect(workspaceMemberRepository.findOwnerMembership).toHaveBeenCalledWith('ws-1', 'user-123');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // canInviteMembers tests
  // ============================================================================
  describe('canInviteMembers', () => {
    it('should return 401 when no user authenticated', async () => {
      mockReq.user = null;

      await canInviteMembers(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when no workspace ID provided', async () => {
      mockReq.user = { userId: 'user-123' };

      await canInviteMembers(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 when user is not a member', async () => {
      mockReq.user = { userId: 'user-123' };
      mockReq.params = { workspaceId: 'ws-1' };

      workspaceMemberRepository.findMembership.mockResolvedValue(null);

      await canInviteMembers(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('not a member'),
        })
      );
    });

    it('should return 403 when member cannot invite', async () => {
      mockReq.user = { userId: 'user-123' };
      mockReq.params = { workspaceId: 'ws-1' };

      workspaceMemberRepository.findMembership.mockResolvedValue({
        role: 'member',
        permissions: { canInvite: false },
      });

      await canInviteMembers(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('permission to invite'),
        })
      );
    });

    it('should call next when user is owner', async () => {
      mockReq.user = { userId: 'user-123' };
      mockReq.params = { workspaceId: 'ws-1' };

      const membership = {
        role: 'owner',
        permissions: { canInvite: false }, // Doesn't matter for owner
      };
      workspaceMemberRepository.findMembership.mockResolvedValue(membership);

      await canInviteMembers(mockReq, mockRes, mockNext);

      expect(mockReq.membership).toEqual(membership);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next when member has invite permission', async () => {
      mockReq.user = { userId: 'user-123' };
      mockReq.params = { workspaceId: 'ws-1' };

      const membership = {
        role: 'member',
        permissions: { canInvite: true },
      };
      workspaceMemberRepository.findMembership.mockResolvedValue(membership);

      await canInviteMembers(mockReq, mockRes, mockNext);

      expect(mockReq.membership).toEqual(membership);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // getUserWorkspaceIds tests
  // ============================================================================
  describe('getUserWorkspaceIds', () => {
    it('should return array of workspace IDs', async () => {
      workspaceMemberRepository.findActiveQueryableWithWorkspace.mockResolvedValue([
        { workspace: { id: { toString: () => 'ws-id-1' } } },
        { workspace: { id: { toString: () => 'ws-id-2' } } },
      ]);

      const result = await getUserWorkspaceIds('user-123');

      expect(result).toEqual(['ws-id-1', 'ws-id-2']);
    });

    it('should filter out null workspace references', async () => {
      workspaceMemberRepository.findActiveQueryableWithWorkspace.mockResolvedValue([
        { workspace: null },
        { workspace: { id: { toString: () => 'ws-id-2' } } },
      ]);

      const result = await getUserWorkspaceIds('user-123');

      expect(result).toEqual(['ws-id-2']);
    });

    it('should return empty array when no memberships', async () => {
      workspaceMemberRepository.findActiveQueryableWithWorkspace.mockResolvedValue([]);

      const result = await getUserWorkspaceIds('user-123');

      expect(result).toEqual([]);
    });

    it('should query active, query-permitted memberships for the user', async () => {
      workspaceMemberRepository.findActiveQueryableWithWorkspace.mockResolvedValue([]);

      await getUserWorkspaceIds('user-123');

      expect(workspaceMemberRepository.findActiveQueryableWithWorkspace).toHaveBeenCalledWith(
        'user-123'
      );
    });
  });
});
