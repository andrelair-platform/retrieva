'use client';

import { useQuery } from '@tanstack/react-query';
import { concentrationApi } from '@/features/concentration/api/concentration';

export function useConcentrationAnalysisQuery() {
  return useQuery({
    queryKey: ['concentration', 'analysis'],
    queryFn: async () => (await concentrationApi.getAnalysis()).data ?? null,
  });
}

export function useConcentrationGraphQuery() {
  return useQuery({
    queryKey: ['concentration', 'graph'],
    queryFn: async () => (await concentrationApi.getGraph()).data ?? null,
  });
}

export function useCriticalFunctionsQuery() {
  return useQuery({
    queryKey: ['concentration', 'functions'],
    queryFn: async () => (await concentrationApi.listFunctions()).data?.functions ?? [],
  });
}

export function useDependenciesQuery() {
  return useQuery({
    queryKey: ['concentration', 'dependencies'],
    queryFn: async () => (await concentrationApi.listDependencies()).data?.dependencies ?? [],
  });
}
