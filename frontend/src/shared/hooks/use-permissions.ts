'use client';

import { useMemo } from 'react';
import { useAuthStore } from '@/state/auth-store';
import { useActiveWorkspace } from '@/features/workspaces/queries/use-workspace-queries';
interface PermissionState {
  // Global checks
  isAdmin: boolean;
  isAuthenticated: boolean;

  // Workspace role checks
  isWorkspaceOwner: boolean;
  isWorkspaceMember: boolean;
  isWorkspaceViewer: boolean;
  hasWorkspaceAccess: boolean;

  // Permission checks
  canQuery: boolean;
  canViewSources: boolean;
  canInvite: boolean;

  // Compound checks
  canManageWorkspace: boolean;
  canTriggerSync: boolean;
  canViewAnalytics: boolean;
  canManageMembers: boolean;
}

type Membership = NonNullable<ReturnType<typeof useActiveWorkspace>>['membership'] | undefined;

// Grant a permission to owners/members by default, otherwise fall back to the explicit flag.
const grant = (base: boolean, explicit: boolean | undefined): boolean => base || (explicit ?? false);

// The role/permission facts derived from the active-workspace membership.
function membershipFacts(membership: Membership) {
  const role = membership?.role;
  const permissions = membership?.permissions;
  const isOwner = role === 'owner';
  const isMember = role === 'member';
  return {
    role,
    permissions,
    isOwner,
    isMember,
    ownerOrMember: isOwner || isMember,
    hasAccess: !!membership && membership.status === 'active',
  };
}

// Resolve the full permission matrix from the current user + active-workspace membership.
// Extracted so the useMemo callback stays a simple delegation (keeps its complexity low).
function computePermissions(
  user: { role: string } | null | undefined,
  isAuthenticated: boolean,
  membership: Membership
): PermissionState {
  const { role, permissions, isOwner, isMember, ownerOrMember, hasAccess } =
    membershipFacts(membership);

  return {
    // Global checks
    isAdmin: user?.role === 'admin',
    isAuthenticated,

    // Workspace role checks
    isWorkspaceOwner: isOwner,
    isWorkspaceMember: isMember,
    isWorkspaceViewer: role === 'viewer',
    hasWorkspaceAccess: hasAccess,

    // Permission checks - owners and members can query by default
    canQuery: grant(ownerOrMember, permissions?.canQuery),
    canViewSources: grant(ownerOrMember, permissions?.canViewSources),
    canInvite: grant(isOwner, permissions?.canInvite),

    // Compound checks
    canManageWorkspace: isOwner,
    canTriggerSync: ownerOrMember,
    canViewAnalytics: ownerOrMember,
    canManageMembers: isOwner,
  };
}

/**
 * Hook to check user permissions at both global and workspace levels
 */
export function usePermissions(): PermissionState {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const activeWorkspace = useActiveWorkspace();

  return useMemo(
    () => computePermissions(user, isAuthenticated, activeWorkspace?.membership),
    [user, isAuthenticated, activeWorkspace]
  );
}

/**
 * Hook to check if user has any of the specified global roles
 */
export function useHasGlobalRole(...roles: Array<'user' | 'admin'>): boolean {
  const user = useAuthStore((state) => state.user);
  return user ? roles.includes(user.role) : false;
}

/**
 * Hook to check if user has any of the specified workspace roles
 */
export function useHasWorkspaceRole(...roles: Array<'owner' | 'member' | 'viewer'>): boolean {
  const activeWorkspace = useActiveWorkspace();
  const role = activeWorkspace?.membership?.role;
  return role ? roles.includes(role) : false;
}
