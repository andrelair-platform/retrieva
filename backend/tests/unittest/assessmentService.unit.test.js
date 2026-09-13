import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import { AssessmentService } from '../../services/AssessmentService.js';

// ---------------------------------------------------------------------------
// Mock module-level imports to prevent real connections on load.
// RTV-49: the service is on Drizzle repositories now (no Mongoose models).
// ---------------------------------------------------------------------------
vi.mock('../../repositories/drizzle/AssessmentRepository.js', () => ({ assessmentRepository: {} }));
vi.mock('../../repositories/drizzle/WorkspaceRepository.js', () => ({ workspaceRepository: {} }));
vi.mock('../../repositories/drizzle/UserRepository.js', () => ({ userRepository: {} }));
vi.mock('../../config/queue.js', () => ({
  assessmentQueue: { add: vi.fn() },
  monitoringQueue: { getJob: vi.fn(), add: vi.fn() },
}));
vi.mock('../../config/storage.js', () => ({
  isStorageConfigured: vi.fn().mockReturnValue(false),
  buildAssessmentFileKey: vi.fn(),
  uploadFile: vi.fn(),
  downloadFileStream: vi.fn(),
}));
vi.mock('../../services/reportGenerator.js', () => ({ generateReport: vi.fn() }));
vi.mock('../../services/fileIngestionService.js', () => ({
  deleteAssessmentCollection: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../config/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const WORKSPACE_ID = randomUUID();
const ASSESSMENT_ID = randomUUID();
const USER_ID = 'user-abc';

const AUTH_IDS = [WORKSPACE_ID];

function makeAssessmentDoc(overrides = {}) {
  return {
    id: ASSESSMENT_ID,
    workspaceId: WORKSPACE_ID,
    name: 'DORA Q1',
    vendorName: 'Acme',
    framework: 'DORA',
    status: 'complete',
    statusMessage: '',
    documents: [],
    createdBy: USER_ID,
    riskDecision: null,
    clauseSignoffs: [],
    createdAt: new Date(),
    ...overrides,
  };
}

function makeFile(name = 'policy.pdf') {
  return {
    originalname: name,
    buffer: Buffer.from('pdf'),
    size: 100,
    mimetype: 'application/pdf',
  };
}

function makeDeps(overrides = {}) {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const storage = {
    isStorageConfigured: vi.fn().mockReturnValue(false),
    buildAssessmentFileKey: vi.fn(),
    uploadFile: vi.fn(),
    downloadFileStream: vi.fn(),
  };
  const assessmentQueue = { add: vi.fn().mockResolvedValue({ id: 'j1' }) };
  const monitoringQueue = {
    getJob: vi.fn().mockResolvedValue(null),
    add: vi.fn().mockResolvedValue({ id: 'j2' }),
  };
  const assessmentRepo = {
    createUnscoped: vi.fn(),
    findByIdUnscoped: vi.fn(),
    updateByIdUnscoped: vi.fn().mockResolvedValue(undefined),
    deleteByIdUnscoped: vi.fn().mockResolvedValue(undefined),
    findByWorkspaces: vi.fn(),
  };
  const workspaceRepo = { updateById: vi.fn().mockResolvedValue(undefined) };
  const userRepo = { markAssessmentCreated: vi.fn().mockReturnValue({ catch: vi.fn() }) };
  const generateReport = vi.fn().mockResolvedValue(Buffer.from('docx'));
  const deleteAssessmentCollection = vi.fn().mockResolvedValue(undefined);
  const deleteAssessmentChunksFromWorkspace = vi.fn().mockResolvedValue(undefined);

  return {
    assessmentRepo,
    workspaceRepo,
    userRepo,
    assessmentQueue,
    monitoringQueue,
    storage,
    generateReport,
    deleteAssessmentCollection,
    deleteAssessmentChunksFromWorkspace,
    logger,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createAssessment
// ---------------------------------------------------------------------------
describe('AssessmentService.createAssessment', () => {
  let deps;
  let svc;

  beforeEach(() => {
    deps = makeDeps();
    svc = new AssessmentService(deps);
  });

  it('creates the assessment record with correct fields', async () => {
    const doc = makeAssessmentDoc({ status: 'pending' });
    deps.assessmentRepo.createUnscoped.mockResolvedValue(doc);

    const result = await svc.createAssessment(
      USER_ID,
      null,
      { name: 'Q1', vendorName: 'Acme', workspaceId: WORKSPACE_ID },
      [makeFile()]
    );

    expect(deps.assessmentRepo.createUnscoped).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Q1',
        vendorName: 'Acme',
        framework: 'DORA',
        status: 'pending',
        workspaceId: WORKSPACE_ID,
      })
    );
    expect(result._id).toBe(ASSESSMENT_ID);
  });

  it('enqueues one fileIndex job per file and one gapAnalysis job', async () => {
    deps.assessmentRepo.createUnscoped.mockResolvedValue(makeAssessmentDoc({ documents: [{}] }));
    const files = [makeFile('a.pdf'), makeFile('b.pdf')];

    await svc.createAssessment(
      USER_ID,
      null,
      { name: 'Q1', vendorName: 'Acme', workspaceId: WORKSPACE_ID },
      files
    );

    const calls = deps.assessmentQueue.add.mock.calls.map((c) => c[0]);
    expect(calls.filter((t) => t === 'fileIndex')).toHaveLength(2);
    expect(calls.filter((t) => t === 'gapAnalysis')).toHaveLength(1);
  });

  it('skips S3 upload when storage is not configured', async () => {
    deps.assessmentRepo.createUnscoped.mockResolvedValue(makeAssessmentDoc());
    deps.storage.isStorageConfigured.mockReturnValue(false);

    await svc.createAssessment(
      USER_ID,
      'org-1',
      { name: 'Q1', vendorName: 'Acme', workspaceId: WORKSPACE_ID },
      [makeFile()]
    );

    expect(deps.storage.uploadFile).not.toHaveBeenCalled();
  });

  it('fires onboarding checklist update', async () => {
    deps.assessmentRepo.createUnscoped.mockResolvedValue(makeAssessmentDoc());

    await svc.createAssessment(
      USER_ID,
      null,
      { name: 'Q1', vendorName: 'Acme', workspaceId: WORKSPACE_ID },
      [makeFile()]
    );

    expect(deps.userRepo.markAssessmentCreated).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getAssessment
// ---------------------------------------------------------------------------
describe('AssessmentService.getAssessment', () => {
  let deps;
  let svc;

  beforeEach(() => {
    deps = makeDeps();
    svc = new AssessmentService(deps);
  });

  it('throws 404 when assessment does not exist', async () => {
    deps.assessmentRepo.findByIdUnscoped.mockResolvedValue(null);
    await expect(svc.getAssessment(ASSESSMENT_ID, AUTH_IDS)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws 403 when workspace is not authorized', async () => {
    const doc = makeAssessmentDoc({ workspaceId: randomUUID() });
    deps.assessmentRepo.findByIdUnscoped.mockResolvedValue(doc);
    await expect(svc.getAssessment(ASSESSMENT_ID, AUTH_IDS)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('returns the assessment when authorized', async () => {
    const doc = makeAssessmentDoc();
    deps.assessmentRepo.findByIdUnscoped.mockResolvedValue(doc);
    const result = await svc.getAssessment(ASSESSMENT_ID, AUTH_IDS);
    expect(result.name).toBe('DORA Q1');
  });
});

// ---------------------------------------------------------------------------
// listAssessments
// ---------------------------------------------------------------------------
describe('AssessmentService.listAssessments', () => {
  let deps;
  let svc;

  beforeEach(() => {
    deps = makeDeps();
    svc = new AssessmentService(deps);
    deps.assessmentRepo.findByWorkspaces.mockResolvedValue({
      assessments: [makeAssessmentDoc()],
      pagination: { total: 1, page: 1, limit: 10, pages: 1 },
    });
  });

  it('returns assessments and pagination metadata', async () => {
    const result = await svc.listAssessments(AUTH_IDS, { page: '1', limit: '10' });
    expect(result.assessments).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.page).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// setRiskDecision
// ---------------------------------------------------------------------------
describe('AssessmentService.setRiskDecision', () => {
  let deps;
  let svc;

  beforeEach(() => {
    deps = makeDeps();
    svc = new AssessmentService(deps);
  });

  it('throws 404 when assessment not found', async () => {
    deps.assessmentRepo.findByIdUnscoped.mockResolvedValue(null);
    await expect(
      svc.setRiskDecision(ASSESSMENT_ID, USER_ID, AUTH_IDS, { decision: 'proceed' })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 403 when workspace not authorized', async () => {
    const doc = makeAssessmentDoc({ workspaceId: randomUUID() });
    deps.assessmentRepo.findByIdUnscoped.mockResolvedValue(doc);
    await expect(
      svc.setRiskDecision(ASSESSMENT_ID, USER_ID, AUTH_IDS, { decision: 'proceed' })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('persists the risk decision and returns it', async () => {
    deps.assessmentRepo.findByIdUnscoped.mockResolvedValue(makeAssessmentDoc());

    const result = await svc.setRiskDecision(ASSESSMENT_ID, USER_ID, AUTH_IDS, {
      decision: 'proceed',
      rationale: 'All good',
    });

    expect(deps.assessmentRepo.updateByIdUnscoped).toHaveBeenCalledWith(
      ASSESSMENT_ID,
      expect.objectContaining({
        riskDecision: expect.objectContaining({ decision: 'proceed', rationale: 'All good' }),
      })
    );
    expect(result.decision).toBe('proceed');
    expect(result.rationale).toBe('All good');
  });

  it('updates the workspace nextReviewDate for proceed decisions', async () => {
    deps.assessmentRepo.findByIdUnscoped.mockResolvedValue(makeAssessmentDoc());
    await svc.setRiskDecision(ASSESSMENT_ID, USER_ID, AUTH_IDS, { decision: 'proceed' });
    expect(deps.workspaceRepo.updateById).toHaveBeenCalledWith(
      WORKSPACE_ID,
      expect.objectContaining({ nextReviewDate: expect.any(Date) })
    );
  });

  it('schedules a review reminder for proceed decisions', async () => {
    deps.assessmentRepo.findByIdUnscoped.mockResolvedValue(makeAssessmentDoc());
    await svc.setRiskDecision(ASSESSMENT_ID, USER_ID, AUTH_IDS, { decision: 'proceed' });
    expect(deps.monitoringQueue.add).toHaveBeenCalledWith(
      'review-reminder',
      expect.any(Object),
      expect.any(Object)
    );
  });

  it('does not schedule a reminder for reject decisions', async () => {
    deps.assessmentRepo.findByIdUnscoped.mockResolvedValue(makeAssessmentDoc());
    await svc.setRiskDecision(ASSESSMENT_ID, USER_ID, AUTH_IDS, { decision: 'reject' });
    expect(deps.monitoringQueue.add).not.toHaveBeenCalled();
  });

  it('does not throw when reminder scheduling fails (non-critical)', async () => {
    deps.assessmentRepo.findByIdUnscoped.mockResolvedValue(makeAssessmentDoc());
    deps.monitoringQueue.getJob.mockRejectedValue(new Error('Redis down'));
    await expect(
      svc.setRiskDecision(ASSESSMENT_ID, USER_ID, AUTH_IDS, { decision: 'proceed' })
    ).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// setClauseSignoff
// ---------------------------------------------------------------------------
describe('AssessmentService.setClauseSignoff', () => {
  let deps;
  let svc;

  beforeEach(() => {
    deps = makeDeps();
    svc = new AssessmentService(deps);
  });

  it('throws 400 when framework is not CONTRACT_A30', async () => {
    deps.assessmentRepo.findByIdUnscoped.mockResolvedValue(makeAssessmentDoc({ framework: 'DORA' }));
    await expect(
      svc.setClauseSignoff(ASSESSMENT_ID, USER_ID, AUTH_IDS, {
        clauseRef: 'Art.30(1)',
        status: 'accepted',
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('pushes a new signoff', async () => {
    const doc = makeAssessmentDoc({ framework: 'CONTRACT_A30', clauseSignoffs: [] });
    deps.assessmentRepo.findByIdUnscoped.mockResolvedValue(doc);

    const result = await svc.setClauseSignoff(ASSESSMENT_ID, USER_ID, AUTH_IDS, {
      clauseRef: 'Art.30(1)',
      status: 'accepted',
      note: 'ok',
    });

    expect(result).toHaveLength(1);
    expect(result[0].clauseRef).toBe('Art.30(1)');
    expect(result[0].status).toBe('accepted');
    expect(deps.assessmentRepo.updateByIdUnscoped).toHaveBeenCalledWith(
      ASSESSMENT_ID,
      expect.objectContaining({ clauseSignoffs: expect.any(Array) })
    );
  });

  it('upserts an existing signoff for the same clauseRef', async () => {
    const doc = makeAssessmentDoc({
      framework: 'CONTRACT_A30',
      clauseSignoffs: [{ clauseRef: 'Art.30(1)', status: 'rejected' }],
    });
    deps.assessmentRepo.findByIdUnscoped.mockResolvedValue(doc);

    const result = await svc.setClauseSignoff(ASSESSMENT_ID, USER_ID, AUTH_IDS, {
      clauseRef: 'Art.30(1)',
      status: 'waived',
    });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('waived');
  });
});

// ---------------------------------------------------------------------------
// deleteAssessment
// ---------------------------------------------------------------------------
describe('AssessmentService.deleteAssessment', () => {
  let deps;
  let svc;

  beforeEach(() => {
    deps = makeDeps();
    svc = new AssessmentService(deps);
  });

  it('throws 404 when assessment not found', async () => {
    deps.assessmentRepo.findByIdUnscoped.mockResolvedValue(null);
    await expect(svc.deleteAssessment(ASSESSMENT_ID, USER_ID, AUTH_IDS)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws 403 when workspace not authorized', async () => {
    const doc = makeAssessmentDoc({ workspaceId: randomUUID() });
    deps.assessmentRepo.findByIdUnscoped.mockResolvedValue(doc);
    await expect(svc.deleteAssessment(ASSESSMENT_ID, USER_ID, AUTH_IDS)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('throws 403 when caller is not the creator', async () => {
    deps.assessmentRepo.findByIdUnscoped.mockResolvedValue(
      makeAssessmentDoc({ createdBy: 'other-user' })
    );
    await expect(svc.deleteAssessment(ASSESSMENT_ID, USER_ID, AUTH_IDS)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('deletes the record and fires Qdrant cleanup', async () => {
    deps.assessmentRepo.findByIdUnscoped.mockResolvedValue(makeAssessmentDoc());

    await svc.deleteAssessment(ASSESSMENT_ID, USER_ID, AUTH_IDS);

    expect(deps.assessmentRepo.deleteByIdUnscoped).toHaveBeenCalledWith(ASSESSMENT_ID);
    expect(deps.deleteAssessmentCollection).toHaveBeenCalledWith(ASSESSMENT_ID);
  });
});
