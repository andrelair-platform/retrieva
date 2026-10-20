'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exitStrategyApi, type ExitArtefactStatus } from '@/features/exit-strategy/api/exit-strategy';

export function useExitArtefactsQuery(status?: ExitArtefactStatus) {
  return useQuery({
    queryKey: ['exit-artefacts', status ?? 'all'],
    queryFn: async () => (await exitStrategyApi.listArtefacts(status)).data?.artefacts ?? [],
  });
}

/** Approve a draft exit artefact. Invalidates the artefact list. */
export function useApproveArtefactMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => exitStrategyApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exit-artefacts'] });
    },
  });
}

/** Reject a draft exit artefact. Invalidates the artefact list. */
export function useRejectArtefactMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => exitStrategyApi.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exit-artefacts'] });
    },
  });
}
