import path from 'path';
import { AppError } from '../utils/index.js';
import { assessmentRepository } from '../repositories/drizzle/AssessmentRepository.js';
import { workspaceRepository } from '../repositories/drizzle/WorkspaceRepository.js';
import { userRepository } from '../repositories/drizzle/UserRepository.js';
import { assessmentQueue, monitoringQueue } from '../config/queue.js';
import * as storageModule from '../config/storage.js';
import { generateReport } from './reportGenerator.js';
import { deleteAssessmentCollection } from './fileIngestionService.js';
import logger from '../config/logger.js';

// Preserve the legacy `_id` field in API responses (value = the uuid `id`) so existing
// frontend consumers keep working through the Postgres cutover (RTV-49).
const withId = (a) => (a ? { ...a, _id: a.id } : a);

class AssessmentService {
  constructor(deps = {}) {
    this.assessmentRepo = deps.assessmentRepo || assessmentRepository;
    this.workspaceRepo = deps.workspaceRepo || workspaceRepository;
    this.userRepo = deps.userRepo || userRepository;
    this.assessmentQueue = deps.assessmentQueue || assessmentQueue;
    this.monitoringQueue = deps.monitoringQueue || monitoringQueue;
    this.storage = deps.storage || storageModule;
    this.generateReport = deps.generateReport || generateReport;
    this.deleteAssessmentCollection = deps.deleteAssessmentCollection || deleteAssessmentCollection;
    this.deleteAssessmentChunksFromWorkspace =
      deps.deleteAssessmentChunksFromWorkspace ||
      (async (assessmentId) => {
        const { deleteAssessmentChunksFromWorkspace } = await import('../config/vectorStore.js');
        return deleteAssessmentChunksFromWorkspace(assessmentId);
      });
    this.logger = deps.logger || logger;
  }

  async createAssessment(userId, organizationId, data, files) {
    const { name, vendorName, framework = 'DORA', workspaceId } = data;

    let categories = [];
    if (data.categories) {
      try {
        const parsed = JSON.parse(data.categories);
        if (Array.isArray(parsed)) categories = parsed;
      } catch {
        categories = [];
      }
    }

    const documents = files.map((f, i) => ({
      fileName: f.originalname,
      fileType: path.extname(f.originalname).replace('.', '').toLowerCase(),
      fileSize: f.size,
      category: typeof categories[i] === 'string' ? categories[i] : null,
      status: 'uploading',
    }));

    const assessment = await this.assessmentRepo.create({
      workspaceId,
      name: name.trim(),
      vendorName: vendorName.trim(),
      framework,
      status: 'pending',
      statusMessage: 'Queued for processing…',
      documents,
      createdBy: userId,
    });

    this.logger.info('Assessment created', {
      service: 'assessment',
      assessmentId: assessment.id,
      userId,
      fileCount: files.length,
    });

    this.userRepo.markAssessmentCreated(userId).catch(() => {});

    if (this.storage.isStorageConfigured() && organizationId) {
      await Promise.all(
        files.map(async (file, i) => {
          const key = this.storage.buildAssessmentFileKey(
            organizationId.toString(),
            workspaceId,
            assessment.id.toString(),
            i,
            file.originalname
          );
          const storageKey = await this.storage
            .uploadFile(key, file.buffer, file.mimetype)
            .catch((err) => {
              this.logger.warn('Assessment file upload to Spaces failed (non-critical)', {
                service: 'assessment',
                assessmentId: assessment.id,
                fileIndex: i,
                error: err.message,
              });
              return null;
            });
          if (storageKey) documents[i].storageKey = storageKey;
        })
      );
      if (documents.some((d) => d.storageKey)) {
        await this.assessmentRepo.updateByIdUnscoped(assessment.id, { documents });
      }
    }

    const fileJobs = files.map((file, i) =>
      this.assessmentQueue.add(
        'fileIndex',
        {
          assessmentId: assessment.id.toString(),
          documentIndex: i,
          buffer: { data: Array.from(file.buffer) },
          fileName: file.originalname,
          fileType: documents[i].fileType,
          vendorName: vendorName.trim(),
          userId,
        },
        { jobId: `fileIndex-${assessment.id}-${i}`, priority: 1 }
      )
    );
    await Promise.all(fileJobs);

    await this.assessmentQueue.add(
      'gapAnalysis',
      { assessmentId: assessment.id.toString(), userId },
      { jobId: `gapAnalysis-${assessment.id}`, delay: files.length * 5000, priority: 2 }
    );

    this.logger.info('Assessment jobs enqueued', {
      service: 'assessment',
      assessmentId: assessment.id,
      jobCount: files.length + 1,
    });

    return {
      _id: assessment.id,
      id: assessment.id,
      name: assessment.name,
      vendorName: assessment.vendorName,
      framework: assessment.framework,
      status: assessment.status,
      statusMessage: assessment.statusMessage,
      documents,
      createdAt: assessment.createdAt,
    };
  }

  async listAssessments(authorizedWorkspaceIds, query = {}) {
    const { workspaceId, status, page = 1, limit = 20 } = query;
    // Explicit cross-workspace org query (unscoped by design — see AssessmentRepository).
    const res = await this.assessmentRepo.findByWorkspaces(authorizedWorkspaceIds, {
      workspaceId,
      status,
      page: parseInt(page),
      limit: parseInt(limit),
    });
    return { assessments: res.assessments.map(withId), pagination: res.pagination };
  }

  async getAssessment(id, authorizedWorkspaceIds) {
    const assessment = await this.assessmentRepo.findByIdUnscoped(id);
    if (!assessment) throw new AppError('Assessment not found', 404);
    if (!authorizedWorkspaceIds.includes(assessment.workspaceId.toString())) {
      throw new AppError('Access denied to this assessment', 403);
    }
    return withId(assessment);
  }

  async getReportBuffer(id, userId, authorizedWorkspaceIds) {
    const assessment = await this.assessmentRepo.findByIdUnscoped(id);
    if (!assessment) throw new AppError('Assessment not found', 404);
    if (!authorizedWorkspaceIds.includes(assessment.workspaceId.toString())) {
      throw new AppError('Access denied to this assessment', 403);
    }
    if (assessment.status !== 'complete') {
      throw new AppError(
        'Assessment is not yet complete. Please wait for analysis to finish.',
        400
      );
    }

    const buffer = await this.generateReport(id);

    const safeVendorName = assessment.vendorName.replace(/[^a-z0-9]/gi, '_').slice(0, 50);
    const dateStr = new Date().toISOString().slice(0, 10);
    const prefix =
      assessment.framework === 'CONTRACT_A30' ? 'ContractA30_Review' : 'DORA_Assessment';
    const filename = `${prefix}_${safeVendorName}_${dateStr}.docx`;

    this.logger.info('Report downloaded', {
      service: 'assessment',
      assessmentId: id,
      userId,
      filename,
    });

    return { buffer, filename };
  }

  async setRiskDecision(id, userId, authorizedWorkspaceIds, { decision, rationale }) {
    const assessment = await this.assessmentRepo.findByIdUnscoped(id);
    if (!assessment) throw new AppError('Assessment not found', 404);
    if (!authorizedWorkspaceIds.includes(assessment.workspaceId.toString())) {
      throw new AppError('Access denied to this assessment', 403);
    }

    const riskDecision = {
      decision,
      setBy: userId,
      setByName: '',
      rationale: rationale?.trim() || '',
      setAt: new Date().toISOString(),
    };
    await this.assessmentRepo.updateByIdUnscoped(id, { riskDecision });

    let nextReviewDate;
    if (decision === 'proceed' || decision === 'conditional') {
      nextReviewDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      await this.workspaceRepo.updateById(assessment.workspaceId, { nextReviewDate });
    }

    this.logger.info('Risk decision recorded', {
      service: 'assessment',
      assessmentId: id,
      decision,
      userId,
    });

    if (nextReviewDate) {
      try {
        const delayMs = Math.max(0, nextReviewDate.getTime() - 30 * 24 * 60 * 60 * 1000 - Date.now());
        const jobId = `review-reminder-${assessment.workspaceId}`;
        const existing = await this.monitoringQueue.getJob(jobId);
        if (existing) await existing.remove();
        await this.monitoringQueue.add(
          'review-reminder',
          { workspaceId: assessment.workspaceId.toString() },
          { jobId, delay: delayMs }
        );

        this.logger.info('Review reminder scheduled', {
          service: 'assessment',
          workspaceId: assessment.workspaceId,
          nextReviewDate,
          delayDays: Math.round(delayMs / 86_400_000),
        });
      } catch (err) {
        this.logger.warn('Failed to schedule review reminder (non-critical)', {
          service: 'assessment',
          workspaceId: assessment.workspaceId,
          error: err.message,
        });
      }
    }

    return riskDecision;
  }

  async setClauseSignoff(id, userId, authorizedWorkspaceIds, { clauseRef, status, note }) {
    const assessment = await this.assessmentRepo.findByIdUnscoped(id);
    if (!assessment) throw new AppError('Assessment not found', 404);
    if (!authorizedWorkspaceIds.includes(assessment.workspaceId.toString())) {
      throw new AppError('Access denied to this assessment', 403);
    }
    if (assessment.framework !== 'CONTRACT_A30') {
      throw new AppError('Clause sign-off is only applicable to CONTRACT_A30 assessments', 400);
    }

    const signoff = {
      clauseRef,
      status,
      signedBy: userId,
      signedByName: '',
      note: note?.trim() || '',
      signedAt: new Date().toISOString(),
    };

    const signoffs = [...(assessment.clauseSignoffs || [])];
    const existingIdx = signoffs.findIndex((s) => s.clauseRef === clauseRef);
    if (existingIdx >= 0) signoffs[existingIdx] = signoff;
    else signoffs.push(signoff);
    await this.assessmentRepo.updateByIdUnscoped(id, { clauseSignoffs: signoffs });

    this.logger.info('Clause sign-off recorded', {
      service: 'assessment',
      assessmentId: id,
      clauseRef,
      status,
      userId,
    });

    return signoffs;
  }

  async getAssessmentFileDownload(id, docIndex, authorizedWorkspaceIds) {
    const assessment = await this.assessmentRepo.findByIdUnscoped(id);
    if (!assessment) throw new AppError('Assessment not found', 404);
    if (!authorizedWorkspaceIds.includes(assessment.workspaceId.toString())) {
      throw new AppError('Access denied to this assessment', 403);
    }

    const idx = parseInt(docIndex, 10);
    const doc = assessment.documents[idx];
    if (!doc?.storageKey) throw new AppError('No file stored for this document', 404);

    const stream = await this.storage.downloadFileStream(doc.storageKey);
    const rawName = doc.storageKey.split('/').pop();
    const fileName = rawName.replace(/^\d+_/, '');

    return { stream, fileName };
  }

  async deleteAssessment(id, userId, authorizedWorkspaceIds) {
    const assessment = await this.assessmentRepo.findByIdUnscoped(id);
    if (!assessment) throw new AppError('Assessment not found', 404);
    if (!authorizedWorkspaceIds.includes(assessment.workspaceId.toString())) {
      throw new AppError('Access denied to this assessment', 403);
    }
    if (String(assessment.createdBy) !== String(userId)) {
      throw new AppError('Only the creator can delete an assessment', 403);
    }

    Promise.resolve(this.deleteAssessmentCollection(id)).catch((err) =>
      this.logger.warn('Failed to delete assessment Qdrant collection', {
        assessmentId: id,
        error: err?.message,
      })
    );
    Promise.resolve(this.deleteAssessmentChunksFromWorkspace(id)).catch((err) =>
      this.logger.warn('Failed to delete assessment chunks from workspace collection', {
        assessmentId: id,
        error: err?.message,
      })
    );

    await this.assessmentRepo.deleteByIdUnscoped(id);

    this.logger.info('Assessment deleted', { service: 'assessment', assessmentId: id, userId });
  }
}

export const assessmentService = new AssessmentService();
export { AssessmentService };
