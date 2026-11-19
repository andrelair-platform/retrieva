import apiClient from '@/shared/api/client';
import type { ApiResponse } from '@/types';

// ── Estate ingestion (RTV-91/106) — the proposal inbox ────────────────────────────────────────────
// Mirrors retrieva-backend /api/v1/discovery. From an export the TENANT uploads (CSV/XLSX/JSON they
// exported from their own tool), the LLM normalises vendors to proposed Register-of-Information entries.
// Nothing is authoritative — each proposal is CONFIRMED by a human (which creates the arrangement), and
// nothing connects to the tenant's systems. Org + entity scoped server-side.

export type DiscoverySource = 'generic';
export type DiscoveryProposalStatus = 'pending' | 'confirmed' | 'dismissed';

export interface DiscoveryProposal {
  id: string;
  organizationId: string;
  runId: string;
  source: DiscoverySource;
  externalId: string;
  externalName: string;
  /** Normalised, provenance-tagged arrangement proposal (shape varies by source). */
  proposal: Record<string, unknown>;
  status: DiscoveryProposalStatus;
  /** Set once confirmed → the created arrangement. */
  arrangementId: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ConfirmProposalResult {
  proposalId: string;
  arrangementId: string;
}

export const discoveryApi = {
  listProposals: async (status?: DiscoveryProposalStatus) => {
    const res = await apiClient.get<ApiResponse<{ proposals: DiscoveryProposal[] }>>('/discovery/proposals', {
      params: status ? { status } : undefined,
    });
    return res.data;
  },
  confirm: async (id: string) => {
    const res = await apiClient.post<ApiResponse<ConfirmProposalResult>>(`/discovery/proposals/${id}/confirm`);
    return res.data;
  },
};
