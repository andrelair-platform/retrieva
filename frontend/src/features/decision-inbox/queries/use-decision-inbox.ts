'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { decisionInboxApi } from '@/features/decision-inbox/api/decision-inbox';
import { arrangementsApi } from '@/features/arrangements/api/arrangements';
import type { RiskStatus } from '@/features/arrangements/api/arrangements';

export function useDecisionQueueQuery() {
  return useQuery({
    queryKey: ['decision-queue'],
    queryFn: async () => (await decisionInboxApi.getQueue()).data ?? null,
  });
}

// Invalidate everything a decision can touch: the queue itself + the per-arrangement findings/risks.
function useInvalidateDecisionState() {
  const qc = useQueryClient();
  return (arrangementId?: string) => {
    qc.invalidateQueries({ queryKey: ['decision-queue'] });
    if (arrangementId) {
      qc.invalidateQueries({ queryKey: ['findings', arrangementId] });
      qc.invalidateQueries({ queryKey: ['risks', arrangementId] });
    }
  };
}

/** Decide a draft finding (RTV-55). `reason` is required by the server for an override. */
export function useDecideFindingMutation() {
  const invalidate = useInvalidateDecisionState();
  return useMutation({
    mutationFn: (v: {
      arrangementId: string;
      findingId: string;
      decision: 'approve' | 'reject' | 'reset';
      reason?: string;
    }) => arrangementsApi.decideFinding(v.arrangementId, v.findingId, v.decision, v.reason),
    onSuccess: (_d, v) => invalidate(v.arrangementId),
  });
}

/** Advance an open risk (RTV-43). `accepted` needs a rationale (management-body sign-off). */
export function useUpdateRiskMutation() {
  const invalidate = useInvalidateDecisionState();
  return useMutation({
    mutationFn: (v: { arrangementId: string; riskId: string; status: RiskStatus; reason?: string }) =>
      arrangementsApi.updateRisk(v.arrangementId, v.riskId, v.status, v.reason),
    onSuccess: (_d, v) => invalidate(v.arrangementId),
  });
}

/** Bulk-accept high-confidence agreements (RTV-67). */
export function useAcceptHighConfidenceMutation() {
  const invalidate = useInvalidateDecisionState();
  return useMutation({
    mutationFn: (threshold?: number) => decisionInboxApi.acceptHighConfidence(threshold),
    onSuccess: () => invalidate(),
  });
}
