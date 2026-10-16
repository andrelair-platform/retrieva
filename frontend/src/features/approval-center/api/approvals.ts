import apiClient from '@/shared/api/client';
import type { ApiResponse } from '@/types';
import type { AssessmentRun } from '@/features/assessment-runs/api/assessment-runs';

// ── Approval Center (RTV-87) — human decisions on the supervisor's run gates ─────────────────────
// Mirrors retrieva-backend /api/v1/approvals (RTV-85). The browser NEVER resumes the graph — it submits
// a decision; the backend validates (RBAC + SoD, concurrency, stale) + records + audits + resumes.

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'edited' | 'expired' | 'superseded';
export type DecisionVerb = 'approve' | 'reject' | 'edit' | 'request_changes';

export interface RunApproval {
  id: string;
  organizationId: string;
  runId: string;
  gate: string;
  status: ApprovalStatus;
  proposedAction: { type?: string; [k: string]: unknown };
  runVersionAtRequest: string;
  assignee: string | null;
  decidedBy: string | null;
  decision: string | null;
  justification: string;
  createdAt: string;
  decidedAt: string | null;
}

export interface DecideBody {
  decision: DecisionVerb;
  justification?: string;
  expectedRunVersion?: number;
}

export interface DecideResult {
  approvalId: string;
  decision: DecisionVerb;
  status: ApprovalStatus;
  run: AssessmentRun;
}

const BASE = '/approvals';

export const approvalsApi = {
  list: async (mine = false) => {
    const res = await apiClient.get<ApiResponse<{ approvals: RunApproval[] }>>(BASE, {
      params: mine ? { mine: true } : undefined,
    });
    return res.data;
  },
  get: async (id: string) => {
    const res = await apiClient.get<ApiResponse<{ approval: RunApproval; run: AssessmentRun }>>(`${BASE}/${id}`);
    return res.data;
  },
  decide: async (id: string, body: DecideBody) => {
    const res = await apiClient.post<ApiResponse<DecideResult>>(`${BASE}/${id}/decision`, body);
    return res.data;
  },
};

// A decision that goes against a clean/problem verdict, or a reject, needs a recorded justification
// (mirrors the backend rule: reject/edit require a reason).
export function decisionNeedsJustification(decision: DecisionVerb): boolean {
  return decision === 'reject' || decision === 'edit' || decision === 'request_changes';
}
