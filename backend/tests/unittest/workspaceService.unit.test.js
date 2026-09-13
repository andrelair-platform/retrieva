import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import { WorkspaceService, serializeWorkspace } from '../../services/WorkspaceService.js';

// ---------------------------------------------------------------------------
// Mock module-level imports so the singleton doesn't crash on load.
// RTV-49: the service is on Drizzle repositories now (no Mongoose models).
// ---------------------------------------------------------------------------
vi.mock('../../repositories/drizzle/WorkspaceRepository.js', () => ({ workspaceRepository: {} }));
vi.mock('../../repositories/drizzle/WorkspaceMemberRepository.js', () => ({
  workspaceMemberRepository: {},
}));
vi.mock('../../repositories/drizzle/OrganizationMemberRepository.js', () => ({
  organizationMemberRepository: {},
}));
vi.mock('../../repositories/drizzle/UserRepository.js', () => ({ userRepository: {} }));
vi.mock('../../repositories/drizzle/AssessmentRepository.js', () => ({ assessmentRepository: {} }));
vi.mock('../../config/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../services/emailService.js', () => ({
  emailService: { sendWorkspaceInvitation: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../../services/fileIngestionService.js', () => ({
  deleteAssessmentCollection: vi.fn().mockResolvedValue(undefined),
}));
// Lazy-imported inside _purgeWorkspaceData (#417) — mock so it doesn't hit Qdrant.
vi.mock('../../config/vectorStore.js', () => ({
  deleteWorkspaceChunks: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const WS_ID = randomUUID();
const USER_ID = randomUUID();
const MEMBER_ID = randomUUID();

function makeWorkspace(overrides = {}) {
  return {
    id: WS_ID,
    name: 'Acme Workspace',
    description: 'test',
    syncStatus: 'idle',
    vendorTier: 'critical',
    serviceType: 'cloud',
    country: 'FR',
    contractStart: null,
    contractEnd: null,
    nextReviewDate: null,
    vendorStatus: 'active',
    certifications: [],
    vendorFunctions: [],
    exitStrategyDoc: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeOwnerMembership(overrides = {}) {
  return {
    id: MEMBER_ID,
    workspaceId: WS_ID,
    userId: USER_ID,
    role: 'owner',
    status: 'active',
    permissions: { canQuery: true, canViewSources: true, canInvite: false },
    ...overrides,
  };
}

function makeDeps(overrides = {}) {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const emailService = { sendWorkspaceInvitation: vi.fn().mockResolvedValue(undefined) };

  const workspaceRepo = {
    create: vi.fn(),
    findById: vi.fn(),
    updateById: vi.fn(),
    deleteById: vi.fn().mockResolvedValue(undefined),
    findByOrganization: vi.fn(),
  };
  const memberRepo = {
    addOwner: vi.fn().mockResolvedValue(undefined),
    findMembership: vi.fn(),
    findOwnerMembership: vi.fn(),
    findById: vi.fn(),
    updateById: vi.fn().mockResolvedValue(undefined),
    findActiveWithWorkspace: vi.fn(),
    findByWorkspaceWithUser: vi.fn(),
    inviteMember: vi.fn(),
  };
  const orgMemberRepo = { findActiveByUserId: vi.fn().mockResolvedValue(null) };
  const userRepo = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    updateOnboarding: vi.fn().mockResolvedValue(undefined),
  };
  const assessmentRepo = {
    findByWorkspaces: vi.fn().mockResolvedValue({ assessments: [] }),
  };
  const deleteAssessmentCollection = vi.fn().mockResolvedValue(undefined);
  const storage = {
    deleteFile: vi.fn().mockResolvedValue(undefined),
    isStorageConfigured: vi.fn(() => false),
  };

  return {
    workspaceRepo,
    memberRepo,
    orgMemberRepo,
    userRepo,
    assessmentRepo,
    deleteAssessmentCollection,
    storage,
    logger,
    emailService,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// serializeWorkspace
// ---------------------------------------------------------------------------
describe('serializeWorkspace', () => {
  it('maps all standard fields', () => {
    const ws = makeWorkspace();
    const result = serializeWorkspace(ws);
    expect(result.id).toBe(WS_ID);
    expect(result.name).toBe('Acme Workspace');
    expect(result.vendorTier).toBe('critical');
  });

  it('merges extras over base fields', () => {
    const ws = makeWorkspace();
    const result = serializeWorkspace(ws, { myRole: 'owner', joinedAt: 'today' });
    expect(result.myRole).toBe('owner');
    expect(result.joinedAt).toBe('today');
  });
});

// ---------------------------------------------------------------------------
// createWorkspace
// ---------------------------------------------------------------------------
describe('WorkspaceService.createWorkspace', () => {
  let deps;
  let svc;

  beforeEach(() => {
    deps = makeDeps();
    svc = new WorkspaceService(deps);
  });

  it('creates workspace and adds owner', async () => {
    const ws = makeWorkspace();
    deps.workspaceRepo.create.mockResolvedValue(ws);

    const result = await svc.createWorkspace(USER_ID, { name: 'Acme' });

    expect(deps.workspaceRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Acme', userId: USER_ID })
    );
    expect(deps.memberRepo.addOwner).toHaveBeenCalledWith(ws.id, USER_ID);
    expect(result.name).toBe('Acme Workspace');
  });

  it('attaches organizationId when creator belongs to an org', async () => {
    const orgId = randomUUID();
    deps.orgMemberRepo.findActiveByUserId.mockResolvedValue({
      organizationId: orgId,
      status: 'active',
    });
    deps.workspaceRepo.create.mockResolvedValue(makeWorkspace());

    await svc.createWorkspace(USER_ID, { name: 'Acme' });

    expect(deps.workspaceRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: orgId })
    );
  });

  it('fires onboarding checklist update (non-blocking)', async () => {
    deps.workspaceRepo.create.mockResolvedValue(makeWorkspace());
    await svc.createWorkspace(USER_ID, { name: 'Acme' });
    expect(deps.userRepo.updateOnboarding).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getWorkspace
// ---------------------------------------------------------------------------
describe('WorkspaceService.getWorkspace', () => {
  let deps;
  let svc;

  beforeEach(() => {
    deps = makeDeps();
    svc = new WorkspaceService(deps);
  });

  it('throws 403 if user is not a member', async () => {
    deps.memberRepo.findMembership.mockResolvedValue(null);
    await expect(svc.getWorkspace(WS_ID, USER_ID)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 404 if workspace does not exist', async () => {
    deps.memberRepo.findMembership.mockResolvedValue(makeOwnerMembership());
    deps.workspaceRepo.findById.mockResolvedValue(null);
    await expect(svc.getWorkspace(WS_ID, USER_ID)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns serialized workspace with role and permissions', async () => {
    deps.memberRepo.findMembership.mockResolvedValue(makeOwnerMembership());
    deps.workspaceRepo.findById.mockResolvedValue(makeWorkspace());

    const result = await svc.getWorkspace(WS_ID, USER_ID);

    expect(result.myRole).toBe('owner');
    expect(result.permissions).toBeDefined();
    expect(result.id).toBe(WS_ID);
  });
});

// ---------------------------------------------------------------------------
// updateWorkspace
// ---------------------------------------------------------------------------
describe('WorkspaceService.updateWorkspace', () => {
  let deps;
  let svc;

  beforeEach(() => {
    deps = makeDeps();
    svc = new WorkspaceService(deps);
  });

  it('throws 403 if caller is not owner', async () => {
    deps.memberRepo.findOwnerMembership.mockResolvedValue(null);
    await expect(svc.updateWorkspace(WS_ID, USER_ID, { name: 'X' })).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('throws 404 if workspace not found', async () => {
    deps.memberRepo.findOwnerMembership.mockResolvedValue(makeOwnerMembership());
    deps.workspaceRepo.findById.mockResolvedValue(null);
    await expect(svc.updateWorkspace(WS_ID, USER_ID, { name: 'X' })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('updates name via the repository', async () => {
    deps.memberRepo.findOwnerMembership.mockResolvedValue(makeOwnerMembership());
    deps.workspaceRepo.findById.mockResolvedValue(makeWorkspace());
    deps.workspaceRepo.updateById.mockResolvedValue(makeWorkspace({ name: 'New Name' }));

    const result = await svc.updateWorkspace(WS_ID, USER_ID, { name: 'New Name' });

    expect(deps.workspaceRepo.updateById).toHaveBeenCalledWith(
      WS_ID,
      expect.objectContaining({ name: 'New Name' })
    );
    expect(result.name).toBe('New Name');
  });
});

// ---------------------------------------------------------------------------
// deleteWorkspace
// ---------------------------------------------------------------------------
describe('WorkspaceService.deleteWorkspace', () => {
  let deps;
  let svc;

  beforeEach(() => {
    deps = makeDeps();
    svc = new WorkspaceService(deps);
  });

  it('throws 403 if caller is not owner', async () => {
    deps.memberRepo.findOwnerMembership.mockResolvedValue(null);
    await expect(svc.deleteWorkspace(WS_ID, USER_ID)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('deletes the workspace (FK cascade removes children)', async () => {
    deps.memberRepo.findOwnerMembership.mockResolvedValue(makeOwnerMembership());

    await svc.deleteWorkspace(WS_ID, USER_ID);

    expect(deps.workspaceRepo.deleteById).toHaveBeenCalledWith(WS_ID);
  });

  it('cascade-purges external vendor data before deleting the workspace (#417)', async () => {
    deps.memberRepo.findOwnerMembership.mockResolvedValue(makeOwnerMembership());
    deps.assessmentRepo.findByWorkspaces.mockResolvedValue({
      assessments: [{ id: 'a1', documents: [{ storageKey: 'k1' }] }],
    });

    await svc.deleteWorkspace(WS_ID, USER_ID);

    // per-assessment Qdrant collection + stored file purged
    expect(deps.deleteAssessmentCollection).toHaveBeenCalledWith('a1');
    expect(deps.storage.deleteFile).toHaveBeenCalledWith('k1');
    // workspace removed last (FK cascade drops rows)
    expect(deps.workspaceRepo.deleteById).toHaveBeenCalledWith(WS_ID);
  });

  it('still deletes the workspace if a purge step fails (best-effort)', async () => {
    deps.memberRepo.findOwnerMembership.mockResolvedValue(makeOwnerMembership());
    deps.assessmentRepo.findByWorkspaces.mockRejectedValue(new Error('db down'));

    await svc.deleteWorkspace(WS_ID, USER_ID);

    expect(deps.workspaceRepo.deleteById).toHaveBeenCalledWith(WS_ID);
  });
});

// ---------------------------------------------------------------------------
// getMyWorkspaces
// ---------------------------------------------------------------------------
describe('WorkspaceService.getMyWorkspaces', () => {
  let deps;
  let svc;

  beforeEach(() => {
    deps = makeDeps();
    svc = new WorkspaceService(deps);
  });

  it('returns org workspaces with org role when user is org member', async () => {
    deps.orgMemberRepo.findActiveByUserId.mockResolvedValue({
      organizationId: 'org-1',
      role: 'org_admin',
      joinedAt: new Date(),
    });
    deps.workspaceRepo.findByOrganization.mockResolvedValue([makeWorkspace()]);

    const result = await svc.getMyWorkspaces(USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].myRole).toBe('owner');
    expect(result[0].permissions.canInvite).toBe(true);
  });

  it('returns direct memberships when user has no org', async () => {
    deps.orgMemberRepo.findActiveByUserId.mockResolvedValue(null);
    deps.memberRepo.findActiveWithWorkspace.mockResolvedValue([
      { workspace: makeWorkspace(), role: 'member', permissions: {}, invitedAt: new Date() },
    ]);

    const result = await svc.getMyWorkspaces(USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].myRole).toBe('member');
  });
});

// ---------------------------------------------------------------------------
// inviteMember
// ---------------------------------------------------------------------------
describe('WorkspaceService.inviteMember', () => {
  let deps;
  let svc;
  const inviteeId = randomUUID();

  beforeEach(() => {
    deps = makeDeps();
    svc = new WorkspaceService(deps);
    deps.workspaceRepo.findById.mockResolvedValue(makeWorkspace());
    deps.memberRepo.findMembership.mockResolvedValue(makeOwnerMembership());
    deps.userRepo.findByEmail.mockResolvedValue({
      id: inviteeId,
      email: 'bob@example.com',
      name: 'Bob',
    });
    deps.userRepo.findById.mockResolvedValue({ name: 'Alice', email: 'alice@example.com' });
    deps.memberRepo.inviteMember.mockResolvedValue({
      id: MEMBER_ID,
      role: 'member',
      status: 'active',
    });
  });

  it('throws 404 if invitee is not registered', async () => {
    deps.userRepo.findByEmail.mockResolvedValue(null);
    await expect(
      svc.inviteMember(WS_ID, USER_ID, { email: 'x@x.com', role: 'member' })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 403 if inviter is not a member', async () => {
    deps.memberRepo.findMembership.mockResolvedValue(null);
    await expect(
      svc.inviteMember(WS_ID, USER_ID, { email: 'bob@example.com', role: 'member' })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 409 if user is already a member', async () => {
    deps.memberRepo.inviteMember.mockRejectedValue(
      new Error('already a member of this workspace')
    );
    await expect(
      svc.inviteMember(WS_ID, USER_ID, { email: 'bob@example.com', role: 'member' })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('returns membership data and fires invitation email', async () => {
    const result = await svc.inviteMember(WS_ID, USER_ID, {
      email: 'bob@example.com',
      role: 'member',
    });

    expect(result.membership.email).toBe('bob@example.com');
    expect(result.inviteeName).toBe('Bob');
    expect(result.workspaceName).toBe('Acme Workspace');
    expect(deps.emailService.sendWorkspaceInvitation).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// revokeMember
// ---------------------------------------------------------------------------
describe('WorkspaceService.revokeMember', () => {
  let deps;
  let svc;

  beforeEach(() => {
    deps = makeDeps();
    svc = new WorkspaceService(deps);
  });

  it('throws 403 if requester is not owner', async () => {
    deps.memberRepo.findOwnerMembership.mockResolvedValue(null);
    await expect(svc.revokeMember(WS_ID, USER_ID, MEMBER_ID)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('throws 404 if member not found', async () => {
    deps.memberRepo.findOwnerMembership.mockResolvedValue(makeOwnerMembership());
    deps.memberRepo.findById.mockResolvedValue(null);
    await expect(svc.revokeMember(WS_ID, USER_ID, MEMBER_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws 400 when trying to revoke an owner', async () => {
    deps.memberRepo.findOwnerMembership.mockResolvedValue(makeOwnerMembership());
    deps.memberRepo.findById.mockResolvedValue({ workspaceId: WS_ID, role: 'owner' });
    await expect(svc.revokeMember(WS_ID, USER_ID, MEMBER_ID)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('sets status to revoked', async () => {
    deps.memberRepo.findOwnerMembership.mockResolvedValue(makeOwnerMembership());
    deps.memberRepo.findById.mockResolvedValue({
      workspaceId: WS_ID,
      role: 'member',
      status: 'active',
      userId: 'u2',
    });

    await svc.revokeMember(WS_ID, USER_ID, MEMBER_ID);

    expect(deps.memberRepo.updateById).toHaveBeenCalledWith(MEMBER_ID, { status: 'revoked' });
  });
});

// ---------------------------------------------------------------------------
// updateMember
// ---------------------------------------------------------------------------
describe('WorkspaceService.updateMember', () => {
  let deps;
  let svc;

  beforeEach(() => {
    deps = makeDeps();
    svc = new WorkspaceService(deps);
  });

  it('throws 403 if requester is not owner', async () => {
    deps.memberRepo.findOwnerMembership.mockResolvedValue(null);
    await expect(
      svc.updateMember(WS_ID, USER_ID, MEMBER_ID, { role: 'viewer' })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 400 when trying to modify owner', async () => {
    deps.memberRepo.findOwnerMembership.mockResolvedValue(makeOwnerMembership());
    deps.memberRepo.findById.mockResolvedValue({ workspaceId: WS_ID, role: 'owner' });
    await expect(
      svc.updateMember(WS_ID, USER_ID, MEMBER_ID, { role: 'viewer' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('updates role via the repository', async () => {
    const member = {
      workspaceId: WS_ID,
      role: 'member',
      permissions: { canQuery: true, canViewSources: true, canInvite: false },
    };
    deps.memberRepo.findOwnerMembership.mockResolvedValue(makeOwnerMembership());
    deps.memberRepo.findById.mockResolvedValue(member);
    deps.memberRepo.updateById.mockResolvedValue({ ...member, role: 'viewer' });

    await svc.updateMember(WS_ID, USER_ID, MEMBER_ID, { role: 'viewer' });

    expect(deps.memberRepo.updateById).toHaveBeenCalledWith(
      MEMBER_ID,
      expect.objectContaining({ role: 'viewer' })
    );
  });
});
