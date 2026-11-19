import apiClient from '@/shared/api/client';
import type { ApiResponse } from '@/types';

/**
 * Audit-readiness dashboard (P4). Mirrors the backend `DashboardResult`
 * (retrieva-backend services/reportability/auditDashboard.ts).
 */
export interface OverdueItem {
  id: string;
  label: string;
  criticality: string | null;
  overdueByDays: number;
  neverAssessed: boolean;
}

export interface DeadlineItem {
  id: string;
  label: string;
  kind: 'contract' | 'reassessment';
  dueInDays: number;
}

export interface AuditDashboard {
  generatedAt: string;
  totals: { arrangements: number; active: number };
  overdueReassessments: {
    total: number;
    cif: number;
    standard: number;
    items: OverdueItem[];
  };
  freshness: { fresh: number; aging: number; stale: number; neverAssessed: number };
  coverage: { total: number; complete: number; withGaps: number; percent: number };
  upcomingDeadlines: {
    windowDays: number;
    contractsExpired: number;
    contractsExpiringSoon: number;
    reassessmentsDueSoon: number;
    items: DeadlineItem[];
  };
}

export const auditReadinessApi = {
  getDashboard: async () => {
    const res = await apiClient.get<ApiResponse<AuditDashboard>>('/reportability/dashboard');
    return res.data;
  },

  /** Download an arrangement's on-demand audit evidence pack as JSON (the auditor dossier). */
  downloadPack: async (arrangementId: string) => {
    const res = await apiClient.get(`/reportability/audit-pack/${arrangementId}`, {
      timeout: 60_000,
    });
    const blob = new Blob([JSON.stringify(res.data?.data ?? res.data, null, 2)], {
      type: 'application/json',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `audit-pack_${arrangementId}_${dateStr}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
