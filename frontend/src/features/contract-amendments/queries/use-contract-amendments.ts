'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { amendmentsApi, type AmendmentStatus } from '@/features/contract-amendments/api/contract-amendments';

export function useAmendmentsQuery(status?: AmendmentStatus) {
  return useQuery({
    queryKey: ['contract-amendments', status ?? 'all'],
    queryFn: async () => (await amendmentsApi.listAmendments(status)).data?.amendments ?? [],
  });
}

/** Accept a drafted amendment clause. Invalidates the amendment list. */
export function useAcceptAmendmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => amendmentsApi.accept(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-amendments'] });
    },
  });
}

/** Reject a drafted amendment clause. Invalidates the amendment list. */
export function useRejectAmendmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => amendmentsApi.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-amendments'] });
    },
  });
}
