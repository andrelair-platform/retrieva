'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { evaluationsApi, researchApi } from '@/features/evaluations/api/evaluations';

export function useEvaluationsQuery() {
  return useQuery({
    queryKey: ['evaluations'],
    queryFn: async () => (await evaluationsApi.list()).data?.evaluations ?? [],
  });
}

export function useEvaluationQuery(id: string) {
  return useQuery({
    queryKey: ['evaluation', id],
    queryFn: async () => (await evaluationsApi.get(id)).data ?? null,
    enabled: !!id,
  });
}

export function useCreateEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; need?: string; legalEntityId?: string | null }) =>
      evaluationsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations'] }),
  });
}

export function useAddCandidate(evaluationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { vendorName: string; doc?: File | null }) =>
      evaluationsApi.addCandidate(evaluationId, v.vendorName, v.doc),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluation', evaluationId] }),
  });
}

export function useSetManualScores(evaluationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { candidateId: string; manualScores: Record<string, number> }) =>
      evaluationsApi.setManualScores(evaluationId, v.candidateId, v.manualScores),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluation', evaluationId] }),
  });
}

/** E5 — research a vendor from a public trust-centre URL (egress-gated; 403 when disabled). */
export function useVendorResearch() {
  return useMutation({
    mutationFn: (v: { vendorName: string; sourceUrl: string }) =>
      researchApi.research(v.vendorName, v.sourceUrl),
  });
}

export function useSelectWinner(evaluationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (candidateId: string) => evaluationsApi.selectWinner(evaluationId, candidateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluation', evaluationId] });
      qc.invalidateQueries({ queryKey: ['evaluations'] });
      qc.invalidateQueries({ queryKey: ['arrangements'] });
    },
  });
}
