import apiClient from '@/shared/api/client';
import type { ApiResponse } from '@/types';

export type RegisterRow = Record<string, unknown>;

export interface RegisterGap {
  template: string;
  code: string;
  label: string;
  ref: string | null;
  reason: string;
}

export interface Register {
  version: string;
  templates: Record<string, RegisterRow[]>;
  gaps: RegisterGap[];
}

export const registerApi = {
  get: async () => {
    const res = await apiClient.get<ApiResponse<Register>>('/register');
    return res.data;
  },

  /** Download the register — full XLSX workbook, or one template as CSV. */
  export: async (format: 'xlsx' | 'csv', template?: string) => {
    const res = await apiClient.get('/register/export', {
      params: { format, ...(template ? { template } : {}) },
      responseType: 'blob',
      timeout: 60_000,
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    const name = format === 'csv' ? `RT0201_${template}_${dateStr}.csv` : `DORA_Register_of_Information_${dateStr}.xlsx`;
    link.setAttribute('download', name);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
