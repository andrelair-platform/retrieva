import apiClient from '@/shared/api/client';
import type { ApiResponse } from '@/types';

// ── domain types (mirror retrieva-backend modules/evaluations + services/evaluation) ─────────────
// A tool-onboarding EVALUATION compares candidate vendors before one is promoted to an arrangement
// (ADR-0002). Retrieva auto-scores the DORA/security/concentration lane; the buyer owns the manual lane.

export type EvaluationStatus = 'draft' | 'scoring' | 'selected' | 'onboarded' | 'cancelled';
export type CandidateStatus = 'candidate' | 'selected' | 'rejected';
export type Lane = 'dora' | 'security' | 'concentration' | 'functional' | 'ux' | 'tco';

export const AUTO_LANES: Lane[] = ['dora', 'security', 'concentration'];
export const isAutoLane = (lane: Lane) => AUTO_LANES.includes(lane);

export interface Criterion {
  key: string;
  label: string;
  weight: number;
  lane: Lane;
}

export interface Evaluation {
  id: string;
  legalEntityId: string | null;
  title: string;
  need: string;
  status: EvaluationStatus;
  criteria: Criterion[];
  winnerCandidateId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationCandidate {
  id: string;
  evaluationId: string;
  vendorName: string;
  proposal: Record<string, unknown> & { confidence?: number };
  autoScores: Partial<Record<Lane, number | null>>;
  manualScores: Partial<Record<Lane, number | null>>;
  status: CandidateStatus;
  arrangementId: string | null;
  notes: string;
  createdAt: string;
}

export interface ScoredCandidate {
  candidateId: string;
  vendorName: string | null;
  total: number; // weighted average over scored criteria (0..100)
  completeness: number; // scored weight / total weight (0..1)
  breakdown: Array<{ key: string; label: string; lane: Lane; weight: number; score: number | null }>;
}

export interface EvaluationDetail {
  evaluation: Evaluation;
  candidates: EvaluationCandidate[];
  ranking: ScoredCandidate[];
}

const BASE = '/evaluations';

export const evaluationsApi = {
  list: async () => {
    const res = await apiClient.get<ApiResponse<{ evaluations: Evaluation[] }>>(BASE);
    return res.data;
  },
  create: async (body: { title: string; need?: string; legalEntityId?: string | null }) => {
    const res = await apiClient.post<ApiResponse<{ evaluation: Evaluation }>>(BASE, body);
    return res.data;
  },
  get: async (id: string) => {
    const res = await apiClient.get<ApiResponse<EvaluationDetail>>(`${BASE}/${id}`);
    return res.data;
  },
  // add a candidate vendor; an optional vendor doc grounds the draft (multipart, field `contract`).
  addCandidate: async (id: string, vendorName: string, doc?: File | null) => {
    const form = new FormData();
    form.append('vendorName', vendorName);
    if (doc) form.append('contract', doc);
    const res = await apiClient.post<ApiResponse<{ candidate: EvaluationCandidate }>>(
      `${BASE}/${id}/candidates`,
      form
    );
    return res.data;
  },
  setManualScores: async (id: string, candidateId: string, manualScores: Record<string, number>) => {
    const res = await apiClient.patch<ApiResponse<{ candidate: EvaluationCandidate }>>(
      `${BASE}/${id}/candidates/${candidateId}`,
      { manualScores }
    );
    return res.data;
  },
  // select the winner → promotes it to an arrangement (prospect) for due diligence.
  selectWinner: async (id: string, candidateId: string) => {
    const res = await apiClient.post<ApiResponse<{ arrangement: { id: string } }>>(
      `${BASE}/${id}/select`,
      { candidateId }
    );
    return res.data;
  },
};

// The manual lanes the buyer scores (auto lanes are filled by Retrieva).
export const MANUAL_LANES: Lane[] = ['functional', 'ux', 'tco'];
export const LANE_LABEL: Record<Lane, string> = {
  dora: 'DORA readiness',
  security: 'Security evidence',
  concentration: 'Concentration',
  functional: 'Functional fit',
  ux: 'Ease of use',
  tco: 'Cost (TCO)',
};
