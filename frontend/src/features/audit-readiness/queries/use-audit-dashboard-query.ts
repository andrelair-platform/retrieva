'use client';

import { useQuery } from '@tanstack/react-query';
import { auditReadinessApi } from '@/features/audit-readiness/api/audit-readiness';

export function useAuditDashboardQuery() {
  return useQuery({
    queryKey: ['audit-readiness', 'dashboard'],
    queryFn: async () => {
      const res = await auditReadinessApi.getDashboard();
      return res.data ?? null;
    },
  });
}
