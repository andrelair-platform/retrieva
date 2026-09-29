import apiClient from '@/shared/api/client';
import type { ApiResponse } from '@/types';

// ── domain types (mirror the retrieva-backend arrangement graph) ────────────────
export type ArrangementType = 'external' | 'intra_group';
export type Criticality = 'critical' | 'important' | 'standard';
export type Level = 'low' | 'medium' | 'high';
// RTV-31 — the arrangement lifecycle (one machine entered by three triggers).
export type LifecycleStatus =
  | 'prospect'
  | 'due_diligence'
  | 'active'
  | 'under_review'
  | 'remediation'
  | 'exiting'
  | 'exited';
// 🟢 new provider → onboarding (prospect); 🟡 existing arrangement / default → active.
export type Trigger = 'new' | 'existing';
export interface LifecycleTransition {
  transition: string;
  to: LifecycleStatus;
  approval: boolean;
}
export type Verdict =
  | 'compliant'
  | 'partial'
  | 'non_compliant'
  | 'insufficient_evidence'
  | 'not_applicable';

export interface LegalEntity {
  id: string;
  name: string;
  lei: string | null;
  country: string;
  isGroupEntity: boolean;
}

export interface BusinessFunction {
  id: string;
  legalEntityId: string;
  name: string;
  criticalOrImportant: boolean;
}

export interface Provider {
  id: string;
  displayName: string;
  canonicalName: string;
  lei?: string | null;
  providerType?: string | null;
}

export interface IctService {
  id: string;
  providerId: string;
  name: string;
  serviceType: string | null;
}

export interface Arrangement {
  id: string;
  organizationId: string;
  legalEntityId: string;
  businessFunctionId: string;
  providerId: string;
  ictServiceId: string | null;
  arrangementType: ArrangementType;
  dataClasses: string[];
  dataResidency: string;
  criticality: Criticality | null;
  dependency: Level | null;
  exitDifficulty: Level | null;
  lifecycleStatus: LifecycleStatus; // RTV-31 — current state in the machine
  createdAt: string;
  // resolved by the API for display
  legalEntityName: string | null;
  businessFunctionName: string | null;
  criticalOrImportant: boolean | null;
  providerName: string | null;
  ictServiceName: string | null;
}

export interface Evidence {
  id: string;
  scope: 'provider' | 'arrangement';
  document: string;
  source: string;
  version: string;
  createdAt: string;
}

export interface Finding {
  id: string;
  arrangementId: string;
  controlId: string;
  libraryVersion: string;
  verdict: Verdict;
  rationale: string;
  citations: Array<{ source: string; snippet: string }>;
  searched: unknown[];
  confidence: number | null;
  status: 'draft' | 'approved' | 'rejected';
  stale?: boolean; // RTV-32: evidence changed since this was assessed → out of date
  createdAt: string;
}

// RTV-42 — arrangement-level "control/evidence coverage" (never "% compliant"): how much of the
// applicable obligation set we have sufficient evidence to assess, + an evidence-derived confidence.
export interface Coverage {
  metricLabel: string; // always "control/evidence coverage"
  applicableControls: number;
  controlsWithSufficientEvidence: number;
  coverage: number; // 0..1
  confidence: number; // 0..1 — evidence-derived, not the model's self-report
  byControl: Array<{
    controlId?: string;
    verdict?: Verdict;
    confidence: number;
    sufficientEvidence: boolean;
  }>;
}

// RTV-43 — a Risk opened when a checker approves a gap-finding; it runs through the remediation loop.
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RiskStatus = 'open' | 'mitigating' | 'mitigated' | 'accepted' | 'closed';
export interface Risk {
  id: string;
  arrangementId: string;
  findingId: string;
  controlId: string;
  libraryVersion: string;
  sourceVerdict: Verdict;
  title: string;
  description: string;
  severity: RiskSeverity;
  status: RiskStatus;
  openedBy: string | null;
  ownerId: string | null;
  remediation: Array<{ at: string; by: string; from: string; to: string; reason: string | null }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateArrangementInput {
  legalEntityId: string;
  businessFunctionId: string;
  providerId: string;
  ictServiceId?: string | null;
  arrangementType: ArrangementType;
  dataClasses?: string[];
  dataResidency?: string;
  criticality?: Criticality | null;
  dependency?: Level | null;
  exitDifficulty?: Level | null;
  trigger?: Trigger; // RTV-31 — sets the initial lifecycle state
}

export interface ArrangementProposal {
  providerName: string | null;
  subcontractors: string[];
  ictServiceName: string | null;
  legalEntityName: string | null;
  businessFunctionName: string | null;
  criticalOrImportant: boolean | null;
  dataClasses: string[];
  dataResidency: string | null;
  arrangementType: ArrangementType | null;
  criticality: Criticality | null;
  confidence: number;
  notes: string;
}

// RTV-34/40 — the DORA controls a contract's clauses touch (deterministic preview shown at intake).
export interface ControlTouchpoint {
  controlId: string;
  title?: string;
  doraArticleRef?: string;
  domain?: string;
  clauseCount: number;
  matchedPatterns: string[];
  sample: string;
}

export interface IntakeResult {
  proposal: ArrangementProposal;
  matches: {
    legalEntityId: string | null;
    providerId: string | null;
    businessFunctionId: string | null;
    ictServiceId: string | null;
  };
  controlTouchpoints: ControlTouchpoint[];
  source: { fileName: string; parsedChars: number };
}

const GRAPH = '/arrangement-graph';

export const arrangementsApi = {
  list: async () => {
    const res = await apiClient.get<ApiResponse<{ arrangements: Arrangement[] }>>('/arrangements');
    return res.data;
  },
  get: async (id: string) => {
    const res = await apiClient.get<ApiResponse<{ arrangement: Arrangement }>>(`/arrangements/${id}`);
    return res.data;
  },
  create: async (input: CreateArrangementInput) => {
    const res = await apiClient.post<ApiResponse<{ arrangement: Arrangement }>>('/arrangements', input);
    return res.data;
  },

  listEvidence: async (id: string) => {
    const res = await apiClient.get<ApiResponse<{ evidence: Evidence[] }>>(`/arrangements/${id}/evidence`);
    return res.data;
  },
  attachEvidence: async (id: string, body: { document: string; source?: string; version?: string }) => {
    const res = await apiClient.post<ApiResponse<{ evidence: Evidence }>>(
      `/arrangements/${id}/evidence`,
      body
    );
    return res.data;
  },
  // Upload a document → index its text (RAG) so assessments cite real passages (RTV-34).
  ingestEvidence: async (id: string, file: File) => {
    const fd = new FormData();
    fd.append('contract', file);
    const res = await apiClient.post<ApiResponse<{ evidence: Evidence; chunks: number }>>(
      `/arrangements/${id}/evidence/ingest`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000 }
    );
    return res.data;
  },

  // AI-assisted intake (RTV-34): upload a contract → the API proposes an arrangement (nothing
  // persisted); the human reviews then confirms.
  intake: async (file: File) => {
    const fd = new FormData();
    fd.append('contract', file);
    const res = await apiClient.post<ApiResponse<IntakeResult>>('/arrangements/intake', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    });
    return res.data;
  },
  confirmIntake: async (proposal: ArrangementProposal, sourceFileName?: string, trigger?: Trigger) => {
    const res = await apiClient.post<ApiResponse<{ arrangement: Arrangement }>>(
      '/arrangements/intake/confirm',
      { proposal, sourceFileName, trigger }
    );
    return res.data;
  },

  // ── lifecycle (RTV-31) ────────────────────────────────────────────────────────
  // The current state + the transitions valid from it (drives the detail-page action buttons).
  getLifecycle: async (id: string) => {
    const res = await apiClient.get<ApiResponse<{ status: LifecycleStatus; transitions: LifecycleTransition[] }>>(
      `/arrangements/${id}/lifecycle`
    );
    return res.data;
  },
  // Advance the state machine. Illegal transitions are rejected (400); approval transitions require
  // a checker role (403) — SoD. Returns the updated arrangement.
  setLifecycle: async (id: string, transition: string) => {
    const res = await apiClient.patch<ApiResponse<{ arrangement: Arrangement }>>(
      `/arrangements/${id}/lifecycle`,
      { transition }
    );
    return res.data;
  },

  runAssessment: async (id: string) => {
    const res = await apiClient.post<ApiResponse<{ jobId: string }>>(`/arrangements/${id}/assessment`);
    return res.data;
  },
  // Findings + the arrangement-level coverage metric (RTV-42) + the stale count (RTV-32).
  getFindings: async (id: string) => {
    const res = await apiClient.get<
      ApiResponse<{ findings: Finding[]; staleCount: number; coverage: Coverage }>
    >(`/arrangements/${id}/findings`);
    return res.data;
  },
  // The human-in-the-loop decision (RTV-55) — a checker approves/rejects a draft finding. Approving a
  // GAP verdict opens a Risk (RTV-43), so callers should also invalidate the risks query.
  decideFinding: async (
    arrangementId: string,
    findingId: string,
    decision: 'approve' | 'reject' | 'reset',
    reason?: string
  ) => {
    const res = await apiClient.patch<ApiResponse<{ finding: Finding; risk: Risk | null }>>(
      `/arrangements/${arrangementId}/findings/${findingId}`,
      { decision, ...(reason ? { reason } : {}) }
    );
    return res.data;
  },

  // ── risk register + remediation loop (RTV-43) ─────────────────────────────────
  getRisks: async (id: string) => {
    const res = await apiClient.get<ApiResponse<{ risks: Risk[] }>>(`/arrangements/${id}/risks`);
    return res.data;
  },
  // Advance a risk through the lifecycle. `mitigating|mitigated|closed|open` need risk:manage;
  // `accepted` is the management-body sign-off (risk:accept) and requires a rationale.
  updateRisk: async (arrangementId: string, riskId: string, status: RiskStatus, reason?: string) => {
    const res = await apiClient.patch<ApiResponse<{ risk: Risk }>>(
      `/arrangements/${arrangementId}/risks/${riskId}`,
      { status, ...(reason ? { reason } : {}) }
    );
    return res.data;
  },

  // ── dimensions ──────────────────────────────────────────────────────────────
  listLegalEntities: async () => {
    const res = await apiClient.get<ApiResponse<{ legalEntities: LegalEntity[] }>>(`${GRAPH}/legal-entities`);
    return res.data;
  },
  createLegalEntity: async (body: { name: string; country?: string; lei?: string }) => {
    const res = await apiClient.post<ApiResponse<{ legalEntity: LegalEntity }>>(`${GRAPH}/legal-entities`, body);
    return res.data;
  },
  listBusinessFunctions: async (legalEntityId?: string) => {
    const res = await apiClient.get<ApiResponse<{ businessFunctions: BusinessFunction[] }>>(
      `${GRAPH}/business-functions`,
      { params: legalEntityId ? { legalEntityId } : {} }
    );
    return res.data;
  },
  createBusinessFunction: async (body: {
    name: string;
    legalEntityId: string;
    criticalOrImportant?: boolean;
  }) => {
    const res = await apiClient.post<ApiResponse<{ businessFunction: BusinessFunction }>>(
      `${GRAPH}/business-functions`,
      body
    );
    return res.data;
  },
  listProviders: async () => {
    const res = await apiClient.get<ApiResponse<{ providers: Provider[] }>>(`${GRAPH}/providers`);
    return res.data;
  },
  createProvider: async (body: { name: string }) => {
    const res = await apiClient.post<ApiResponse<{ provider: Provider }>>(`${GRAPH}/providers`, body);
    return res.data;
  },
  listIctServices: async (providerId?: string) => {
    const res = await apiClient.get<ApiResponse<{ ictServices: IctService[] }>>(`${GRAPH}/ict-services`, {
      params: providerId ? { providerId } : {},
    });
    return res.data;
  },
  createIctService: async (body: { name: string; providerId: string }) => {
    const res = await apiClient.post<ApiResponse<{ ictService: IctService }>>(`${GRAPH}/ict-services`, body);
    return res.data;
  },
};
