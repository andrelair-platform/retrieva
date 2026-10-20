import apiClient from '@/shared/api/client';
import type { ApiResponse } from '@/types';

// ── Contract Amendments (RTV-97/98) — the contract-amendment redliner's draft inbox ──────────────
// Mirrors retrieva-backend /api/v1/amendments. For missing or weak DORA Art. 30 obligations the
// redliner drafts an amendment clause against a template; each draft is reviewed by a human who
// ACCEPTS or REJECTS it. Nothing is applied automatically. Org + entity scoped server-side.

export type AmendmentGapLevel = 'missing' | 'partial';
export type AmendmentStatus = 'pending' | 'accepted' | 'rejected';

export interface ContractAmendment {
  id: string;
  organizationId: string;
  assessmentId: string;
  vendorName: string;
  /** e.g. "Art.30(2)(a)" */
  article: string;
  /** clause category */
  category: string;
  gapLevel: AmendmentGapLevel;
  templateRef: string;
  /** the AI-drafted amendment clause (can be long) */
  draftText: string;
  /** why this clause + what the vendor lacks */
  rationale: string;
  editedText: string;
  status: AmendmentStatus;
  createdAt: string;
  updatedAt: string | null;
}

export const amendmentsApi = {
  listAmendments: async (status?: AmendmentStatus) => {
    const res = await apiClient.get<ApiResponse<{ amendments: ContractAmendment[] }>>('/amendments', {
      params: status ? { status } : undefined,
    });
    return res.data;
  },
  accept: async (id: string) => {
    const res = await apiClient.post<ApiResponse<ContractAmendment>>(`/amendments/${id}/accept`);
    return res.data;
  },
  reject: async (id: string) => {
    const res = await apiClient.post<ApiResponse<ContractAmendment>>(`/amendments/${id}/reject`);
    return res.data;
  },
};
