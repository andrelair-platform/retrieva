// Postgres enum types (RTV-48). DB-level integrity — an invalid status literally
// cannot be inserted (stronger than the app-side Mongoose enums; cert evidence).
// Doc-shaped fields (documents/results/questions/certifications/…) are JSONB, not
// enums — only scalar domain enums live here.
import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);

export const orgIndustryEnum = pgEnum('org_industry', [
  'insurance',
  'banking',
  'investment',
  'payments',
  'other',
]);
export const orgPlanEnum = pgEnum('org_plan', [
  'starter',
  'professional',
  'business',
  'enterprise',
]);
export const orgPlanStatusEnum = pgEnum('org_plan_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'paused',
]);
export const orgMemberRoleEnum = pgEnum('org_member_role', ['org_admin', 'analyst', 'viewer']);

// Shared by organization_members + workspace_members (identical value set).
export const memberStatusEnum = pgEnum('member_status', ['pending', 'active', 'revoked']);

export const workspaceSyncStatusEnum = pgEnum('workspace_sync_status', [
  'idle',
  'syncing',
  'synced',
  'error',
]);
// Shared by workspace.vendor_tier + provider_dependencies node tiers.
export const tierEnum = pgEnum('tier', ['critical', 'important', 'standard']);
export const serviceTypeEnum = pgEnum('service_type', [
  'cloud',
  'software',
  'data',
  'network',
  'other',
]);
export const vendorStatusEnum = pgEnum('vendor_status', ['active', 'under-review', 'exited']);
export const workspaceMemberRoleEnum = pgEnum('workspace_member_role', [
  'owner',
  'member',
  'viewer',
]);

export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant']);

export const assessmentFrameworkEnum = pgEnum('assessment_framework', ['DORA', 'CONTRACT_A30']);
export const assessmentStatusEnum = pgEnum('assessment_status', [
  'pending',
  'indexing',
  'analyzing',
  'complete',
  'failed',
]);

export const criticalityEnum = pgEnum('criticality', ['critical', 'important']);

export const providerNodeKindEnum = pgEnum('provider_node_kind', ['workspace', 'external']);
export const providerSourceEnum = pgEnum('provider_source', ['manual', 'extracted']);

export const questionnaireStatusEnum = pgEnum('questionnaire_status', [
  'draft',
  'sent',
  'partial',
  'complete',
  'expired',
  'failed',
]);
