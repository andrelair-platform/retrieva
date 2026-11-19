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

// Generic ingestion (RTV-106) — the tenant uploads an export; the LLM infers which column holds the
// provider name etc., applied deterministically to every row. Mirrors /discovery/generic/{preview,run}.
export interface ColumnMapping {
  provider: string;
  service?: string;
  spend?: string;
  criticality?: string;
  id?: string;
}
export interface GenericSampleApp {
  id: string;
  label: string;
  name: string;
  meta?: Record<string, string>;
}
export interface GenericPreview {
  rowCount: number;
  headers: string[];
  mapping: ColumnMapping;
  confidence: number;
  usedFallback: boolean;
  sample: GenericSampleApp[];
}
export interface GenericRunResult {
  runId: string;
  status: string;
  rowCount: number;
  normalised: number;
  mapping: ColumnMapping;
  confidence: number;
  usedFallback: boolean;
}

/** Build the multipart/JSON body the generic endpoints accept: a file, or a pasted JSON array. */
function genericBody(input: { file?: File; rows?: unknown[] }) {
  if (input.file) {
    const fd = new FormData();
    fd.append('file', input.file);
    return { body: fd as unknown as Record<string, unknown>, headers: { 'Content-Type': 'multipart/form-data' } };
  }
  return { body: { rows: input.rows ?? [] }, headers: {} };
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

  // Preview the column mapping (one LLM call on a sample) — nothing persisted.
  genericPreview: async (input: { file?: File; rows?: unknown[] }) => {
    const { body, headers } = genericBody(input);
    const res = await apiClient.post<ApiResponse<GenericPreview>>('/discovery/generic/preview', body, {
      headers,
      timeout: 120_000,
    });
    return res.data;
  },
  // Run it → normalised vendors become proposals in the inbox (async).
  genericRun: async (input: { file?: File; rows?: unknown[] }) => {
    const { body, headers } = genericBody(input);
    const res = await apiClient.post<ApiResponse<GenericRunResult>>('/discovery/generic/run', body, {
      headers,
      timeout: 120_000,
    });
    return res.data;
  },
};
