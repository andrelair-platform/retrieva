'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discoveryApi, type DiscoveryProposalStatus } from '@/features/discovery/api/discovery';

export function useDiscoveryProposalsQuery(status?: DiscoveryProposalStatus) {
  return useQuery({
    queryKey: ['discovery-proposals', status ?? 'all'],
    queryFn: async () => (await discoveryApi.listProposals(status)).data?.proposals ?? [],
  });
}

/** Confirm a proposal → creates the arrangement. Invalidates the proposal list + the arrangement graph. */
export function useConfirmProposalMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => discoveryApi.confirm(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discovery-proposals'] });
      qc.invalidateQueries({ queryKey: ['arrangements'] });
    },
  });
}
