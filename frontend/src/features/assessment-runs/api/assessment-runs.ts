import apiClient from '@/shared/api/client';
import type { ApiResponse } from '@/types';

// ── Assessment runs (RTV-86) — the AgentOps workspace data layer ────────────────────────────────
// Mirrors retrieva-backend /api/v1/assessment-runs (the deterministic supervisor, RTV-78). The backend
// now returns the house ApiResponse envelope, so `res.data` is the envelope and `.data` is the payload.

export type RunStatus =
  | 'queued'
  | 'running'
  | 'waiting_human'
  | 'resuming'
  | 'blocked'
  | 'cancelled'
  | 'failed'
  | 'done';

export interface AssessmentRun {
  id: string;
  organizationId: string;
  arrangementId: string;
  status: RunStatus;
  currentNode: string;
  statusMessage: string;
  langfuseTraceId: string | null;
  rowVersion: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RunSummary {
  run: AssessmentRun;
  waiting: boolean;
  // The interrupt() payload the human must act on (shape depends on the gate). Opaque here.
  interrupt: { type?: string; [k: string]: unknown } | null;
}

// A run is "active" (worth polling) until it reaches a terminal state.
export const ACTIVE_STATUSES: RunStatus[] = ['queued', 'running', 'resuming', 'waiting_human'];
export const TERMINAL_STATUSES: RunStatus[] = ['blocked', 'cancelled', 'failed', 'done'];

// The deterministic pipeline the supervisor walks (business stages shown to the operator — NOT raw
// model messages). Order matters for the monitor view.
export const RUN_STAGES = ['intake', 'confirm_gate', 'gap', 'findings'] as const;

const BASE = '/assessment-runs';

export const assessmentRunsApi = {
  list: async () => {
    const res = await apiClient.get<ApiResponse<{ runs: AssessmentRun[] }>>(BASE);
    return res.data;
  },
  start: async (arrangementId: string) => {
    const res = await apiClient.post<ApiResponse<RunSummary>>(BASE, { arrangementId });
    return res.data;
  },
};
