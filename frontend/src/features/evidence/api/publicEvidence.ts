import axios from 'axios';
import type { ApiResponse } from '@/types';
import { getApiUrl } from '@/lib/runtime-env';

// RTV-227 / #227 — the vendor-facing evidence portal client. Like the questionnaire /q/:token client,
// it uses a PLAIN axios instance (no auth interceptor, no credentials) so an external vendor with no
// Retrieva account never triggers a token-refresh loop; the path token is the only credential.

export interface RequestedCategoryRef {
  category: string;
  label: string;
}

export interface PublicEvidenceRequest {
  vendorEmail: string;
  vendorContactName: string;
  message: string;
  requestedCategories: RequestedCategoryRef[];
  expiresAt: string | null;
}

const publicClient = axios.create({
  baseURL: getApiUrl(),
  withCredentials: false,
  timeout: 120_000,
});

export const publicEvidenceApi = {
  getRequest: async (token: string) => {
    const res = await publicClient.get<ApiResponse<{ request: PublicEvidenceRequest }>>(
      `/public/evidence/${token}`
    );
    return res.data;
  },

  upload: async (token: string, category: string, file: File) => {
    const fd = new FormData();
    fd.append('contract', file);
    fd.append('category', category);
    const res = await publicClient.post<
      ApiResponse<{ evidence: { id: string; document: string; category: string }; chunks: number }>
    >(`/public/evidence/${token}/upload`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  submit: async (token: string) => {
    const res = await publicClient.post<ApiResponse<{ status: string }>>(
      `/public/evidence/${token}/submit`,
      {}
    );
    return res.data;
  },
};
