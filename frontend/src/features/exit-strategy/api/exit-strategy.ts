import apiClient from '@/shared/api/client';
import type { ApiResponse } from '@/types';

// ── Exit Strategy (RTV-99/100/101/102) — the exit-strategy agents' draft inbox ───────────────────
// Mirrors retrieva-backend /api/v1/exit-strategy. For each critical-or-important function the agents
// draft exit artefacts — substitute providers, exit blueprints, reintegration models. Nothing is
// authoritative — each draft is APPROVED or REJECTED by a human. Org + entity scoped server-side.

export type ExitArtefactType = 'provider_match' | 'exit_blueprint' | 'reintegration_model';
export type ExitArtefactStatus = 'draft' | 'approved' | 'rejected';

export interface ExitArtefact {
  id: string;
  organizationId: string;
  arrangementId: string;
  type: ExitArtefactType;
  providerName: string;
  /** 'critical' | 'important' | '' */
  criticality: string;
  /** One-line headline for the inbox. */
  summary: string;
  payload: Record<string, unknown>;
  /** 'true' | 'false' (string!) — whether the deterministic fallback produced this draft. */
  usedFallback: string;
  status: ExitArtefactStatus;
  decisionNote: string;
  createdAt: string;
  updatedAt: string | null;
}

export const exitStrategyApi = {
  listArtefacts: async (status?: ExitArtefactStatus) => {
    const res = await apiClient.get<ApiResponse<{ artefacts: ExitArtefact[] }>>('/exit-strategy', {
      params: status ? { status } : undefined,
    });
    return res.data;
  },
  approve: async (id: string) => {
    const res = await apiClient.post<ApiResponse<ExitArtefact>>(`/exit-strategy/${id}/approve`);
    return res.data;
  },
  reject: async (id: string) => {
    const res = await apiClient.post<ApiResponse<ExitArtefact>>(`/exit-strategy/${id}/reject`);
    return res.data;
  },
};
