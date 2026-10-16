'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assessmentRunsApi, ACTIVE_STATUSES, type AssessmentRun } from '@/features/assessment-runs/api/assessment-runs';

const RUNS_KEY = ['assessment-runs'];

/**
 * The org's runs, newest first. Live status via polling: while any run is active the query refetches
 * every 4s; once all runs are terminal it stops (socket.io push is a later enhancement — the backend
 * server isn't wired yet). No refetch while the tab is hidden.
 */
export function useAssessmentRunsQuery() {
  return useQuery({
    queryKey: RUNS_KEY,
    queryFn: async () => (await assessmentRunsApi.list()).data?.runs ?? [],
    refetchInterval: (query) => {
      const runs = (query.state.data as AssessmentRun[] | undefined) ?? [];
      return runs.some((r) => ACTIVE_STATUSES.includes(r.status)) ? 4000 : false;
    },
    refetchIntervalInBackground: false,
  });
}

/** Start a new assessment run for an arrangement; refreshes the list on success. */
export function useStartRunMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (arrangementId: string) => assessmentRunsApi.start(arrangementId),
    onSuccess: () => qc.invalidateQueries({ queryKey: RUNS_KEY }),
  });
}
