'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { surveillanceApi, type SurveillanceEventStatus } from '@/features/surveillance/api/surveillance';

export function useSurveillanceEventsQuery(status?: SurveillanceEventStatus) {
  return useQuery({
    queryKey: ['surveillance-events', status ?? 'all'],
    queryFn: async () => (await surveillanceApi.listEvents(status)).data?.events ?? [],
  });
}

/** Acknowledge an event — marks it seen. Invalidates the event feed. */
export function useAcknowledgeEventMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => surveillanceApi.acknowledge(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['surveillance-events'] });
    },
  });
}

/** Resolve an event — closes it out. Invalidates the event feed. */
export function useResolveEventMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => surveillanceApi.resolve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['surveillance-events'] });
    },
  });
}
