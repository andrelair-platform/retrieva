/**
 * Unit Tests — loadWorkspace & loadWorkspaceSafe middleware
 *
 * All DB models are mocked so tests run without a real MongoDB instance.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks (must be declared before importing the subject) ────────────────────

vi.mock('../../config/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../repositories/drizzle/WorkspaceRepository.js', () => ({
  workspaceRepository: { findById: vi.fn() },
}));

vi.mock('../../repositories/drizzle/WorkspaceMemberRepository.js', () => ({
  workspaceMemberRepository: { findMembership: vi.fn() },
}));

vi.mock('../../utils/index.js', () => ({
  sendError: (res, status, message) => {
    res.status(status).json({ success: false, message });
  },
}));

import { loadWorkspace, loadWorkspaceSafe } from '../../middleware/loadWorkspace.js';
import { workspaceRepository } from '../../repositories/drizzle/WorkspaceRepository.js';
import { workspaceMemberRepository } from '../../repositories/drizzle/WorkspaceMemberRepository.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  return res;
}

const OWNER_ID = 'user-owner-123';
const OTHER_USER_ID = 'user-other-456';
const WORKSPACE_ID = 'workspace-abc';

const mockWorkspace = {
  id: WORKSPACE_ID,
  userId: { toString: () => OWNER_ID },
  name: 'Test Workspace',
};

const mockMembership = {
  workspaceId: WORKSPACE_ID,
  userId: OTHER_USER_ID,
  status: 'active',
};

// ─── loadWorkspace ────────────────────────────────────────────────────────────

describe('loadWorkspace middleware', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { params: { id: WORKSPACE_ID }, user: { userId: OWNER_ID }, ip: '127.0.0.1' };
    res = makeRes();
    next = vi.fn();
  });

  it('returns 400 when no workspace id in params', async () => {
    req.params = {};
    await loadWorkspace(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when user is not authenticated', async () => {
    req.user = undefined;
    await loadWorkspace(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when req.user has no userId', async () => {
    req.user = {};
    await loadWorkspace(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 404 when workspace does not exist', async () => {
    workspaceRepository.findById.mockResolvedValue(null);
    await loadWorkspace(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user is neither owner nor active member', async () => {
    req.user = { userId: OTHER_USER_ID };
    workspaceRepository.findById.mockResolvedValue(mockWorkspace);
    workspaceMemberRepository.findMembership.mockResolvedValue(null);

    await loadWorkspace(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and sets req.workspace when user is workspace owner', async () => {
    workspaceRepository.findById.mockResolvedValue(mockWorkspace);
    workspaceMemberRepository.findMembership.mockResolvedValue(null);

    await loadWorkspace(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.workspace).toBe(mockWorkspace);
    expect(req.isWorkspaceOwner).toBe(true);
    expect(req.workspaceMembership).toBeNull();
  });

  it('calls next and sets req.workspace when user is an active member', async () => {
    req.user = { userId: OTHER_USER_ID };
    workspaceRepository.findById.mockResolvedValue(mockWorkspace);
    workspaceMemberRepository.findMembership.mockResolvedValue(mockMembership);

    await loadWorkspace(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.workspace).toBe(mockWorkspace);
    expect(req.workspaceMembership).toBe(mockMembership);
    expect(req.isWorkspaceOwner).toBe(false);
  });

  it('calls next when user is both owner and member', async () => {
    const ownerMembership = { ...mockMembership, userId: OWNER_ID };
    workspaceRepository.findById.mockResolvedValue(mockWorkspace);
    workspaceMemberRepository.findMembership.mockResolvedValue(ownerMembership);

    await loadWorkspace(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.isWorkspaceOwner).toBe(true);
  });

  it('queries WorkspaceMember with correct filter', async () => {
    workspaceRepository.findById.mockResolvedValue(mockWorkspace);
    workspaceMemberRepository.findMembership.mockResolvedValue(mockMembership);

    await loadWorkspace(req, res, next);

    expect(workspaceMemberRepository.findMembership).toHaveBeenCalledWith(WORKSPACE_ID, OWNER_ID);
  });
});

// ─── loadWorkspaceSafe ────────────────────────────────────────────────────────

describe('loadWorkspaceSafe middleware', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { params: { id: WORKSPACE_ID }, user: { userId: OWNER_ID }, ip: '127.0.0.1' };
    res = makeRes();
    next = vi.fn();
  });

  it('returns 400 when no workspace id in params', async () => {
    req.params = {};
    await loadWorkspaceSafe(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 401 when user is not authenticated', async () => {
    req.user = undefined;
    await loadWorkspaceSafe(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 404 when workspace does not exist', async () => {
    workspaceRepository.findById.mockResolvedValue(null);

    await loadWorkspaceSafe(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when user has no access', async () => {
    workspaceRepository.findById.mockResolvedValue(mockWorkspace);
    req.user = { userId: OTHER_USER_ID };
    workspaceMemberRepository.findMembership.mockResolvedValue(null);

    await loadWorkspaceSafe(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('calls next and attaches workspace when owner accesses', async () => {
    workspaceRepository.findById.mockResolvedValue(mockWorkspace);
    workspaceMemberRepository.findMembership.mockResolvedValue(null);

    await loadWorkspaceSafe(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.workspace).toBe(mockWorkspace);
    expect(req.isWorkspaceOwner).toBe(true);
  });

  it('calls next when user is an active member', async () => {
    req.user = { userId: OTHER_USER_ID };
    workspaceRepository.findById.mockResolvedValue(mockWorkspace);
    workspaceMemberRepository.findMembership.mockResolvedValue(mockMembership);

    await loadWorkspaceSafe(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.isWorkspaceOwner).toBe(false);
  });
});
