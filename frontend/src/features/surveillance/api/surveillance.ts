import apiClient from '@/shared/api/client';
import type { ApiResponse } from '@/types';

// ── Surveillance (RTV-94/95/96) — the CTPP surveillance agent's event feed ───────────────────────
// Mirrors retrieva-backend /api/v1/surveillance. The agent watches third-party ICT providers for
// incidents (statuspage), CVEs and breaches, and records each as an event with a blast-radius
// estimate. Nothing auto-rates your risk — each event is ACKNOWLEDGED then RESOLVED by a human; the
// feed only informs your risk view. Org + entity scoped server-side.

export type SurveillanceSource = 'statuspage' | 'cve' | 'breach' | 'other';
export type SurveillanceSeverity = 'critical' | 'high' | 'medium' | 'low';
export type SurveillanceEventStatus = 'open' | 'acknowledged' | 'resolved';

export interface SurveillanceEvent {
  id: string;
  organizationId: string;
  runId: string;
  providerNodeId: string | null;
  providerName: string;
  source: SurveillanceSource;
  externalId: string;
  type: string; // 'incident' | 'cve' | 'breach' | …
  severity: SurveillanceSeverity;
  title: string;
  summary: string;
  url: string;
  observedAt: string | null;
  blastRadius: Record<string, unknown>;
  alerted: boolean;
  status: SurveillanceEventStatus;
  createdAt: string;
  updatedAt: string | null;
}

export const surveillanceApi = {
  listEvents: async (status?: SurveillanceEventStatus, severity?: SurveillanceSeverity) => {
    const res = await apiClient.get<ApiResponse<{ events: SurveillanceEvent[] }>>('/surveillance/events', {
      params: status || severity ? { ...(status ? { status } : {}), ...(severity ? { severity } : {}) } : undefined,
    });
    return res.data;
  },
  acknowledge: async (id: string) => {
    const res = await apiClient.post<ApiResponse<SurveillanceEvent>>(`/surveillance/events/${id}/acknowledge`);
    return res.data;
  },
  resolve: async (id: string) => {
    const res = await apiClient.post<ApiResponse<SurveillanceEvent>>(`/surveillance/events/${id}/resolve`);
    return res.data;
  },
};
