'use client';

import { useQuery } from '@tanstack/react-query';
import { arrangementsApi } from '@/features/arrangements/api/arrangements';

export function useArrangementsQuery() {
  return useQuery({
    queryKey: ['arrangements'],
    queryFn: async () => {
      const res = await arrangementsApi.list();
      return res.data?.arrangements ?? [];
    },
  });
}

export function useArrangementQuery(id: string) {
  return useQuery({
    queryKey: ['arrangement', id],
    queryFn: async () => {
      const res = await arrangementsApi.get(id);
      return res.data?.arrangement ?? null;
    },
    enabled: !!id,
  });
}

/** RTV-31 — the arrangement's lifecycle state + the transitions valid from it. */
export function useArrangementLifecycleQuery(id: string) {
  return useQuery({
    queryKey: ['arrangement-lifecycle', id],
    queryFn: async () => {
      const res = await arrangementsApi.getLifecycle(id);
      return res.data ?? null;
    },
    enabled: !!id,
  });
}

export function useArrangementEvidenceQuery(id: string) {
  return useQuery({
    queryKey: ['arrangement-evidence', id],
    queryFn: async () => {
      const res = await arrangementsApi.listEvidence(id);
      return res.data?.evidence ?? [];
    },
    enabled: !!id,
  });
}

/**
 * Findings for an arrangement. When `poll` is set, refetch every 4s (the assessment runs
 * async on the worker) until findings appear — mirrors use-assessment-list-query.
 */
export function useFindingsQuery(id: string, poll = false) {
  return useQuery({
    queryKey: ['findings', id],
    queryFn: async () => {
      const res = await arrangementsApi.getFindings(id);
      return res.data?.findings ?? [];
    },
    enabled: !!id,
    refetchInterval: poll ? (query) => (query.state.data && query.state.data.length > 0 ? false : 4000) : false,
  });
}
