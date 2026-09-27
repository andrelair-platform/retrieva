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
 * Findings for an arrangement, plus the arrangement-level coverage metric (RTV-42). When `poll` is
 * set, refetch every 4s (the assessment runs async on the worker) until findings appear.
 */
export function useFindingsQuery(id: string, poll = false) {
  return useQuery({
    queryKey: ['findings', id],
    queryFn: async () => {
      const res = await arrangementsApi.getFindings(id);
      return {
        findings: res.data?.findings ?? [],
        coverage: res.data?.coverage ?? null,
        staleCount: res.data?.staleCount ?? 0,
      };
    },
    enabled: !!id,
    refetchInterval: poll
      ? (query) => (query.state.data && query.state.data.findings.length > 0 ? false : 4000)
      : false,
  });
}

/** RTV-43 — the arrangement's risk register / remediation loop (gaps a checker approved). */
export function useRisksQuery(id: string) {
  return useQuery({
    queryKey: ['risks', id],
    queryFn: async () => {
      const res = await arrangementsApi.getRisks(id);
      return res.data?.risks ?? [];
    },
    enabled: !!id,
  });
}
