'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { onboardingApi } from '@/features/arrangements/api/onboarding';

/** The pre-contract decision pack — only meaningful while the arrangement is in prospect/due_diligence. */
export function useOnboardingDecisionQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: ['onboarding-decision', id],
    queryFn: async () => (await onboardingApi.getDecision(id)).data ?? null,
    enabled: !!id && enabled,
  });
}

/** The mandatory DORA Art. 30 clause pack for the arrangement (criticality-tiered). */
export function useClausePackQuery(id: string) {
  return useQuery({
    queryKey: ['clause-pack', id],
    queryFn: async () => (await onboardingApi.getClausePack(id)).data ?? null,
    enabled: !!id,
  });
}

/** Gap-check an uploaded draft contract against the required clauses. */
export function useClauseGapCheck(id: string) {
  return useMutation({
    mutationFn: (draft: File) => onboardingApi.gapCheckClauses(id, draft),
  });
}
