'use client';

import { useActiveWorkspace } from '@/lib/hooks';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { WorkspacePermissions, WorkspaceRole } from '@/types';

// Granular permissions stored in membership
type GranularPermission = 'canQuery' | 'canViewSources' | 'canInvite';
// Role-based compound permissions
type CompoundPermission = 'canTriggerSync' | 'canViewAnalytics' | 'canManageMembers';
type Permission = GranularPermission | CompoundPermission;

interface RequirePermissionProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Resolve whether the given role/permissions grant a permission (shared by both components).
function computeHasPermission(
  role: WorkspaceRole | undefined,
  permissions: WorkspacePermissions | undefined,
  permission: Permission
): boolean {
  const isOwner = role === 'owner';
  const isMember = role === 'member';

  // Owners always have all permissions
  if (isOwner) {
    return true;
  }
  if (permission === 'canTriggerSync' || permission === 'canViewAnalytics') {
    // These are available to members and owners
    return isMember;
  }
  if (permission === 'canManageMembers') {
    // Only owners can manage members
    return false;
  }
  // Granular permissions from membership
  return permissions?.[permission as GranularPermission] === true;
}

/**
 * Component that renders children only if user has the specified permission.
 * Used for hiding UI elements based on granular workspace permissions.
 */
export function RequirePermission({
  permission,
  children,
  fallback = null,
}: RequirePermissionProps) {
  const activeWorkspace = useActiveWorkspace();
  const membership = activeWorkspace?.membership;

  const hasPermission = computeHasPermission(membership?.role, membership?.permissions, permission);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Tooltip messages for each permission
const permissionTooltips: Record<Permission, string> = {
  canQuery: 'You need query permission to ask questions',
  canViewSources: 'You need permission to view source documents',
  canInvite: 'Only workspace owners can invite members',
  canTriggerSync: 'Members and owners can sync data sources',
  canViewAnalytics: 'Members and owners can view analytics',
  canManageMembers: 'Only workspace owners can manage members',
};

interface DisabledWithTooltipProps {
  permission: Permission;
  children: React.ReactElement;
  className?: string;
}

/**
 * Component that shows a disabled element with a tooltip explaining why.
 * Use this for the "hybrid" RBAC approach - showing disabled state for upgrade-path features.
 */
export function DisabledWithTooltip({
  permission,
  children,
  className,
}: DisabledWithTooltipProps) {
  const activeWorkspace = useActiveWorkspace();
  const membership = activeWorkspace?.membership;

  // Check permission based on type (same logic as RequirePermission)
  const hasPermission = computeHasPermission(membership?.role, membership?.permissions, permission);

  if (hasPermission) {
    return children;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-block', className)}>
            {/* Clone the child element and disable it */}
            <span className="pointer-events-none opacity-50">
              {children}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{permissionTooltips[permission]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
