import apiClient from '@/shared/api/client';
import type { ApiResponse } from '@/types';
import type { Verdict, RiskSeverity, RiskStatus } from '@/features/arrangements/api/arrangements';

// ── Decision inbox (RTV-67) — mirrors retrieva-backend modules/decisionQueue ────────────────
// One cross-arrangement queue of everything the AI concluded that awaits a human decision: draft
// findings (RTV-55) + open risks (RTV-43), urgency-sorted (least-confident / most-severe first).

export interface DecisionItem {
  kind: 'finding' | 'risk';
  id: string;
  arrangementId: string;
  providerName: string;
  businessFunctionName: string;
  controlId: string;
  urgency: number;
  createdAt: string;
  // finding-only
  verdict?: Verdict;
  confidence?: number | null;
  rationale?: string;
  citations?: Array<{ source: string; snippet: string }>;
  // risk-only
  severity?: RiskSeverity;
  sourceVerdict?: Verdict;
  title?: string;
  description?: string;
  status?: RiskStatus;
}

export interface DecisionQueue {
  items: DecisionItem[];
  counts: { findings: number; risks: number; total: number };
}

export interface AcceptHighConfidenceResult {
  threshold: number;
  highConfidence: number;
  candidates: number;
  approved: number;
  requiresIndividualReason: number;
  skipped: Array<{ findingId: string; controlId: string; reason: string }>;
}

const BASE = '/decision-queue';

export const decisionInboxApi = {
  getQueue: async () => {
    const res = await apiClient.get<ApiResponse<DecisionQueue>>(BASE);
    return res.data;
  },
  // Bulk-accept the AI's high-confidence AGREEMENTS (clean verdicts ≥ threshold) through the same
  // SoD/audit path as a single decision. Gaps that would be an override are reported, never forced.
  acceptHighConfidence: async (threshold?: number) => {
    const res = await apiClient.post<ApiResponse<AcceptHighConfidenceResult>>(
      `${BASE}/accept-high-confidence`,
      threshold != null ? { threshold } : {}
    );
    return res.data;
  },
};

// Pure mirror of the backend's isVerdictOverride (services/security/separationOfDuties): approving a
// PROBLEM verdict (accepting flagged risk) or rejecting a CLEAN verdict goes against the AI → an
// override that requires a recorded reason. Used to enforce the reason field in the UI (RTV-55/AC-4).
const PROBLEM_VERDICTS: Verdict[] = ['non_compliant', 'partial', 'insufficient_evidence'];
export function isVerdictOverride(verdict: Verdict, decision: 'approve' | 'reject'): boolean {
  if (decision === 'approve') return PROBLEM_VERDICTS.includes(verdict);
  if (decision === 'reject') return !PROBLEM_VERDICTS.includes(verdict);
  return false;
}
