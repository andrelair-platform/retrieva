'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approvalsApi, type DecideBody } from '@/features/approval-center/api/approvals';

const KEY = ['approvals'];

/** Pending gate approvals for the org (optionally only mine). Polls every 5s so new gates appear. */
export function useApprovalsQuery(mine = false) {
  return useQuery({
    queryKey: [...KEY, { mine }],
    queryFn: async () => (await approvalsApi.list(mine)).data?.approvals ?? [],
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
}

/** Submit an authorised decision. Invalidates the inbox + the runs list (status changes on resume). */
export function useDecideApprovalMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; body: DecideBody }) => approvalsApi.decide(v.id, v.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['assessment-runs'] });
    },
  });
}
