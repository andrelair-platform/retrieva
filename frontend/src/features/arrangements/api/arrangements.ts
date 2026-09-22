import apiClient from '@/shared/api/client';
import type { ApiResponse } from '@/types';

// ── domain types (mirror the retrieva-backend arrangement graph) ────────────────
export type ArrangementType = 'external' | 'intra_group';
export type Criticality = 'critical' | 'important' | 'standard';
export type Level = 'low' | 'medium' | 'high';
export type Verdict =
  | 'compliant'
  | 'partial'
  | 'non_compliant'
  | 'insufficient_evidence'
  | 'not_applicable';

export interface LegalEntity {
  id: string;
  name: string;
  lei: string | null;
  country: string;
  isGroupEntity: boolean;
}

export interface BusinessFunction {
  id: string;
  legalEntityId: string;
  name: string;
  criticalOrImportant: boolean;
}

export interface Provider {
  id: string;
  displayName: string;
  canonicalName: string;
  lei?: string | null;
  providerType?: string | null;
}

export interface IctService {
  id: string;
  providerId: string;
  name: string;
  serviceType: string | null;
}

export interface Arrangement {
  id: string;
  organizationId: string;
  legalEntityId: string;
  businessFunctionId: string;
  providerId: string;
  ictServiceId: string | null;
  arrangementType: ArrangementType;
  dataClasses: string[];
  dataResidency: string;
  criticality: Criticality | null;
  dependency: Level | null;
  exitDifficulty: Level | null;
  createdAt: string;
  // resolved by the API for display
  legalEntityName: string | null;
  businessFunctionName: string | null;
  criticalOrImportant: boolean | null;
  providerName: string | null;
  ictServiceName: string | null;
}

export interface Evidence {
  id: string;
  scope: 'provider' | 'arrangement';
  document: string;
  source: string;
  version: string;
  createdAt: string;
}

export interface Finding {
  id: string;
  arrangementId: string;
  controlId: string;
  libraryVersion: string;
  verdict: Verdict;
  rationale: string;
  citations: Array<{ source: string; snippet: string }>;
  searched: unknown[];
  confidence: number | null;
  status: 'draft' | 'approved' | 'rejected';
  createdAt: string;
}

export interface CreateArrangementInput {
  legalEntityId: string;
  businessFunctionId: string;
  providerId: string;
  ictServiceId?: string | null;
  arrangementType: ArrangementType;
  dataClasses?: string[];
  dataResidency?: string;
  criticality?: Criticality | null;
  dependency?: Level | null;
  exitDifficulty?: Level | null;
}

const GRAPH = '/arrangement-graph';

export const arrangementsApi = {
  list: async () => {
    const res = await apiClient.get<ApiResponse<{ arrangements: Arrangement[] }>>('/arrangements');
    return res.data;
  },
  get: async (id: string) => {
    const res = await apiClient.get<ApiResponse<{ arrangement: Arrangement }>>(`/arrangements/${id}`);
    return res.data;
  },
  create: async (input: CreateArrangementInput) => {
    const res = await apiClient.post<ApiResponse<{ arrangement: Arrangement }>>('/arrangements', input);
    return res.data;
  },

  listEvidence: async (id: string) => {
    const res = await apiClient.get<ApiResponse<{ evidence: Evidence[] }>>(`/arrangements/${id}/evidence`);
    return res.data;
  },
  attachEvidence: async (id: string, body: { document: string; source?: string; version?: string }) => {
    const res = await apiClient.post<ApiResponse<{ evidence: Evidence }>>(
      `/arrangements/${id}/evidence`,
      body
    );
    return res.data;
  },

  runAssessment: async (id: string) => {
    const res = await apiClient.post<ApiResponse<{ jobId: string }>>(`/arrangements/${id}/assessment`);
    return res.data;
  },
  getFindings: async (id: string) => {
    const res = await apiClient.get<ApiResponse<{ findings: Finding[] }>>(`/arrangements/${id}/findings`);
    return res.data;
  },

  // ── dimensions ──────────────────────────────────────────────────────────────
  listLegalEntities: async () => {
    const res = await apiClient.get<ApiResponse<{ legalEntities: LegalEntity[] }>>(`${GRAPH}/legal-entities`);
    return res.data;
  },
  createLegalEntity: async (body: { name: string; country?: string; lei?: string }) => {
    const res = await apiClient.post<ApiResponse<{ legalEntity: LegalEntity }>>(`${GRAPH}/legal-entities`, body);
    return res.data;
  },
  listBusinessFunctions: async (legalEntityId?: string) => {
    const res = await apiClient.get<ApiResponse<{ businessFunctions: BusinessFunction[] }>>(
      `${GRAPH}/business-functions`,
      { params: legalEntityId ? { legalEntityId } : {} }
    );
    return res.data;
  },
  createBusinessFunction: async (body: {
    name: string;
    legalEntityId: string;
    criticalOrImportant?: boolean;
  }) => {
    const res = await apiClient.post<ApiResponse<{ businessFunction: BusinessFunction }>>(
      `${GRAPH}/business-functions`,
      body
    );
    return res.data;
  },
  listProviders: async () => {
    const res = await apiClient.get<ApiResponse<{ providers: Provider[] }>>(`${GRAPH}/providers`);
    return res.data;
  },
  createProvider: async (body: { name: string }) => {
    const res = await apiClient.post<ApiResponse<{ provider: Provider }>>(`${GRAPH}/providers`, body);
    return res.data;
  },
  listIctServices: async (providerId?: string) => {
    const res = await apiClient.get<ApiResponse<{ ictServices: IctService[] }>>(`${GRAPH}/ict-services`, {
      params: providerId ? { providerId } : {},
    });
    return res.data;
  },
  createIctService: async (body: { name: string; providerId: string }) => {
    const res = await apiClient.post<ApiResponse<{ ictService: IctService }>>(`${GRAPH}/ict-services`, body);
    return res.data;
  },
};
