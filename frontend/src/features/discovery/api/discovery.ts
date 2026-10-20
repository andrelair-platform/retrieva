import apiClient from '@/shared/api/client';
import type { ApiResponse } from '@/types';

// ── Discovery (RTV-91/106/107) — the source-agnostic discovery agent's proposal inbox ────────────
// Mirrors retrieva-backend /api/v1/discovery. The agent sweeps connected source systems (Entra ID,
// SaaS registries, uploads, REST/SCIM/OData) and proposes Register-of-Information entries. Nothing is
// authoritative — each proposal is CONFIRMED by a human (which creates the arrangement). Org + entity
// scoped server-side.

export type DiscoverySource = 'okta' | 'authentik' | 'erpnext' | 'generic' | 'rest' | 'scim' | 'odata';
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
