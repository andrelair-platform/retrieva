import apiClient from '@/shared/api/client';
import type { ApiResponse } from '@/types';

export interface OrganizationData {
  id: string;
  name: string;
  industry: string;
  country: string;
  plan?: string;
  planStatus?: string;
  trialEndsAt?: string | null;
}

/** The DORA workflow roles assignable to a member (mirrors the backend ASSIGNABLE_ROLES). */
export type DomainRole =
  | 'entity_admin'
  | 'analyst'
  | 'procurement'
  | 'ict_risk_officer'
  | 'legal'
  | 'security_officer'
  | 'dpo'
  | 'business_owner'
  | 'auditor'
  | 'viewer';

export interface OrgMember {
  id: string;
  email: string;
  role: 'org_admin' | 'analyst' | 'viewer';
  status: 'pending' | 'active' | 'revoked';
  joinedAt?: string;
  /** Active entity-scope DORA roles this member holds (empty for pending invitees). */
  domainRoles?: DomainRole[];
  user?: { id: string; name: string; email: string } | null;
}

export interface InviteInfoResponse {
  organizationName: string;
  inviterName: string | null;
  role: string;
  email: string;
}

export const organizationsApi = {
  create: async (data: { name: string; industry: string; country: string }) => {
    const response = await apiClient.post<ApiResponse<{ organization: OrganizationData }>>(
      '/organizations',
      data
    );
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get<
      ApiResponse<{ organization: OrganizationData | null; role: string | null }>
    >('/organizations/me');
    return response.data;
  },

  getInviteInfo: async (token: string) => {
    const response = await apiClient.get<ApiResponse<InviteInfoResponse>>(
      `/organizations/invite-info?token=${encodeURIComponent(token)}`
    );
    return response.data;
  },

  invite: async (data: { email: string; role: string; domainRole?: DomainRole }) => {
    const response = await apiClient.post<ApiResponse<{ member: OrgMember }>>(
      '/organizations/invite',
      data
    );
    return response.data;
  },

  /** Grant a DORA domain role to an existing member. Gated server-side to entity_admin (user:manage). */
  assignRole: async (data: { userId: string; role: DomainRole }) => {
    const response = await apiClient.post<ApiResponse>('/organizations/role-assignments', data);
    return response.data;
  },

  /** Revoke a member's DORA domain role. Gated server-side to entity_admin (user:manage). */
  revokeRole: async (data: { userId: string; role: DomainRole }) => {
    const response = await apiClient.delete<ApiResponse>('/organizations/role-assignments', {
      data,
    });
    return response.data;
  },

  acceptInvite: async (token: string) => {
    const response = await apiClient.post<ApiResponse>('/organizations/accept-invite', {
      token,
    });
    return response.data;
  },

  getMembers: async () => {
    const response = await apiClient.get<ApiResponse<{ members: OrgMember[] }>>(
      '/organizations/members'
    );
    return response.data;
  },

  removeMember: async (memberId: string) => {
    const response = await apiClient.delete<ApiResponse>(
      `/organizations/members/${memberId}`
    );
    return response.data;
  },
};
