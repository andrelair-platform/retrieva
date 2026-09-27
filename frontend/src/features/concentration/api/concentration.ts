import apiClient from '@/shared/api/client';
import type { ApiResponse } from '@/types';

// ── domain types (mirror retrieva-backend modules/concentration) ────────────────
// Concentration is ORG-scoped — it deliberately spans every provider the firm uses (DORA Art. 29).

export type FunctionCriticality = 'critical' | 'important';

/** A node in the concentration analysis (an assessed provider or a reached sub-node). */
export interface ConcentrationNode {
  key: string;
  name: string;
  isAssessedProvider: boolean;
  supportedFunctions: number;
  weightedScore: number;
  reachedByProviderCount: number;
}

export interface SinglePointOfFailure {
  functionId: string;
  functionName: string;
  criticality: FunctionCriticality;
  soleProvider: string;
}

export interface ConcentrationCoverage {
  totalProviders: number;
  providersMappedToFunctions: number;
  unmappedProviders: string[];
  criticalFunctionCount: number;
  nthPartyEdges: number;
}

export interface ConcentrationAnalysis {
  providerConcentration: ConcentrationNode[];
  sharedSubstrate: ConcentrationNode[];
  singlePointsOfFailure: SinglePointOfFailure[];
  coverage: ConcentrationCoverage;
}

// viz-ready graph (GET /graph)
export type GraphNodeType = 'function' | 'provider' | 'subprovider';
export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  criticality?: FunctionCriticality;
  tier?: string | null;
  concentrationScore?: number;
}
export interface GraphEdge {
  from: string;
  to: string;
  kind: 'depends_on' | 'sub_processes_via';
  source?: string;
  confirmed?: boolean;
}
export interface ConcentrationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: ConcentrationAnalysis;
}

export interface CriticalFunction {
  id: string;
  name: string;
  criticality: FunctionCriticality;
  description?: string | null;
  dependsOn: string[]; // provider (workspace) ids
}

// nth-party dependency edge (GET /dependencies) — a provider→sub-provider link, AI-extracted or manual.
export interface DependencyEndpoint {
  kind: 'workspace' | 'external';
  name: string;
  workspaceId?: string | null;
}
export interface ProviderDependency {
  id: string;
  parent: DependencyEndpoint;
  child: DependencyEndpoint;
  source: string | null; // e.g. 'ai_extracted' | 'manual'
  confirmed: boolean;
}

export interface UpsertCriticalFunctionInput {
  id?: string;
  name: string;
  criticality: FunctionCriticality;
  description?: string;
  dependsOn?: string[];
}

const BASE = '/concentration';

export const concentrationApi = {
  getAnalysis: async () => {
    const res = await apiClient.get<ApiResponse<ConcentrationAnalysis>>(BASE);
    return res.data;
  },
  getGraph: async () => {
    const res = await apiClient.get<ApiResponse<ConcentrationGraph>>(`${BASE}/graph`);
    return res.data;
  },
  listFunctions: async () => {
    const res = await apiClient.get<ApiResponse<{ functions: CriticalFunction[] }>>(`${BASE}/functions`);
    return res.data;
  },
  saveFunction: async (body: UpsertCriticalFunctionInput) => {
    const res = await apiClient.post<ApiResponse<{ function: CriticalFunction }>>(`${BASE}/functions`, body);
    return res.data;
  },
  deleteFunction: async (id: string) => {
    const res = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE}/functions/${id}`);
    return res.data;
  },
  listDependencies: async () => {
    const res = await apiClient.get<ApiResponse<{ dependencies: ProviderDependency[] }>>(`${BASE}/dependencies`);
    return res.data;
  },
  // Human-in-the-loop confirmation of an AI-extracted nth-party edge.
  confirmDependency: async (id: string, confirmed: boolean) => {
    const res = await apiClient.patch<ApiResponse<{ dependency: ProviderDependency }>>(
      `${BASE}/dependencies/${id}`,
      { confirmed }
    );
    return res.data;
  },
};
