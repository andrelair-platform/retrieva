import apiClient from '@/shared/api/client';
import type { ApiResponse } from '@/types';

// ── pre-contract onboarding: the decision pack + the DORA Art. 30 clause pack (ADR-0002 E1/E3) ───

export type ReadinessStatus = 'pass' | 'fail' | 'pending';
export interface ReadinessItem {
  key: 'intake' | 'assessment' | 'findings' | 'evidence' | string;
  status: ReadinessStatus;
  detail: string;
}
export interface Readiness {
  items: ReadinessItem[];
  /** the ENFORCED gate — identical to the backend activationBlockers() being empty */
  canActivate: boolean;
  blockers: string[];
}
export interface Intake {
  businessPurpose: string | null;
  expectedCost: string | number | null;
  expectedCostCurrency: string | null;
  requestedStartDate: string | null;
  requestedBy: string | null;
}

export interface OnboardingDecision {
  arrangementId: string;
  recommendation: 'ready' | 'review' | 'blocked';
  reasons: string[];
  assessment: {
    total: number;
    byVerdict: Record<string, number>;
    gaps: Array<{ controlId: string | null; verdict: string | null; severity: string; confidence: number | null }>;
    blocking: number;
    needsEvidence: number;
  };
  concentration: {
    entityTopProvider: { name: string | null; weightedScore: number } | null;
    functionIsSpof: boolean;
    sharedSubstrate: string[];
    addsToSharedSubstrate: boolean;
  };
  exit: { difficulty: 'low' | 'medium' | 'high' | 'unknown' };
  gate: { state: string | null; canApproveOnboarding: boolean; canReject: boolean; transitions: string[] };
  /** pre-contract readiness checklist (makes the hard activation gate legible before approval) */
  readiness?: Readiness;
  /** Workflow B intake — the business owner's submitted need */
  intake?: Intake;
}

export interface ClauseRequirement {
  controlId: string;
  articleRef: string;
  title: string;
  requirement: string;
  tier: 'baseline' | 'cif';
  mandatory: boolean;
  signals: string[];
}
export interface ClausePack {
  arrangementId: string;
  libraryVersion: string;
  cif: boolean;
  total: number;
  clauses: ClauseRequirement[];
}

export type ClauseCoverage = 'covered' | 'weak' | 'missing';
export interface ClauseGapItem extends ClauseRequirement {
  coverage: ClauseCoverage;
  clauseCount: number;
  matchedSignals: string[];
  coverageRatio: number;
  sample: string | null;
}
export interface ClauseGapReport {
  arrangementId: string;
  libraryVersion: string;
  cif: boolean;
  summary: { required: number; covered: number; weak: number; missing: number };
  items: ClauseGapItem[];
  source?: { fileName: string; parsedChars: number };
}

const BASE = '/arrangements';

export const onboardingApi = {
  getDecision: async (id: string) => {
    const res = await apiClient.get<ApiResponse<OnboardingDecision>>(`${BASE}/${id}/onboarding-decision`);
    return res.data;
  },
  getClausePack: async (id: string) => {
    const res = await apiClient.get<ApiResponse<ClausePack>>(`${BASE}/${id}/contract-clauses`);
    return res.data;
  },
  gapCheckClauses: async (id: string, draft: File) => {
    const form = new FormData();
    form.append('contract', draft);
    const res = await apiClient.post<ApiResponse<ClauseGapReport>>(
      `${BASE}/${id}/contract-clauses/gap-check`,
      form
    );
    return res.data;
  },
};
