'use client';

import { useQuery } from '@tanstack/react-query';
import { registerApi } from '@/features/register/api/register';

export function useRegisterQuery() {
  return useQuery({
    queryKey: ['register'],
    queryFn: async () => {
      const res = await registerApi.get();
      return res.data ?? null;
    },
  });
}
