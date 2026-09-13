CREATE TYPE "public"."assessment_framework" AS ENUM('DORA', 'CONTRACT_A30');--> statement-breakpoint
CREATE TYPE "public"."assessment_status" AS ENUM('pending', 'indexing', 'analyzing', 'complete', 'failed');--> statement-breakpoint
CREATE TYPE "public"."criticality" AS ENUM('critical', 'important');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('pending', 'active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."org_member_role" AS ENUM('org_admin', 'analyst', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."org_plan_status" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'paused');--> statement-breakpoint
CREATE TYPE "public"."provider_node_kind" AS ENUM('workspace', 'external');--> statement-breakpoint
CREATE TYPE "public"."provider_source" AS ENUM('manual', 'extracted');--> statement-breakpoint
CREATE TYPE "public"."questionnaire_status" AS ENUM('draft', 'sent', 'partial', 'complete', 'expired', 'failed');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('critical', 'important', 'standard');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."vendor_status" AS ENUM('active', 'under-review', 'exited');--> statement-breakpoint
CREATE TYPE "public"."workspace_member_role" AS ENUM('owner', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."workspace_sync_status" AS ENUM('idle', 'syncing', 'synced', 'error');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"refresh_tokens" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_login" timestamp with time zone,
	"login_attempts" integer DEFAULT 0 NOT NULL,
	"lock_until" timestamp with time zone,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"email_verification_token" text,
	"email_verification_expires" timestamp with time zone,
	"email_verification_last_sent_at" timestamp with time zone,
	"password_reset_token" text,
	"password_reset_expires" timestamp with time zone,
	"notification_preferences" jsonb DEFAULT '{"inApp":{"workspace_invitation":true,"workspace_removed":true,"permission_changed":true,"member_joined":true,"member_left":false,"sync_completed":true,"sync_failed":true,"indexing_completed":false,"indexing_failed":true,"system_alert":true,"token_limit_warning":true},"email":{"workspace_invitation":true,"workspace_removed":true,"permission_changed":false,"sync_failed":true,"system_alert":true,"token_limit_reached":true,"weekly_digest":true}}'::jsonb NOT NULL,
	"organization_id" uuid,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"onboarding_checklist" jsonb DEFAULT '{"vendorCreated":false,"assessmentCreated":false,"memberInvited":false,"monitoringSetup":false,"dismissed":false}'::jsonb NOT NULL,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"mfa_secret" text,
	"mfa_recovery_codes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"email" text NOT NULL,
	"role" "org_member_role" DEFAULT 'analyst' NOT NULL,
	"status" "member_status" DEFAULT 'pending' NOT NULL,
	"invite_token_hash" text,
	"invite_token_expires" timestamp with time zone,
	"invited_by" uuid,
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"industry" text DEFAULT 'other' NOT NULL,
	"country" text DEFAULT '' NOT NULL,
	"owner_id" uuid NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"plan" text DEFAULT 'starter' NOT NULL,
	"plan_status" "org_plan_status" DEFAULT 'trialing' NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_industry_check" CHECK ("organizations"."industry" in ('insurance', 'banking', 'investment', 'payments', 'other')),
	CONSTRAINT "organizations_plan_check" CHECK ("organizations"."plan" in ('starter', 'professional', 'business', 'enterprise'))
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "workspace_member_role" DEFAULT 'member' NOT NULL,
	"invited_by" uuid,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "member_status" DEFAULT 'active' NOT NULL,
	"permissions" jsonb DEFAULT '{"canQuery":true,"canViewSources":true,"canInvite":false}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"user_id" uuid NOT NULL,
	"sync_status" "workspace_sync_status" DEFAULT 'idle' NOT NULL,
	"vendor_tier" "tier",
	"country" text DEFAULT '' NOT NULL,
	"service_type" text,
	"contract_start" timestamp with time zone,
	"contract_end" timestamp with time zone,
	"next_review_date" timestamp with time zone,
	"vendor_status" "vendor_status" DEFAULT 'under-review' NOT NULL,
	"certifications" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"vendor_functions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"exit_strategy_doc" text,
	"alerts_sent_at" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"organization_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_service_type_check" CHECK ("workspaces"."service_type" is null or "workspaces"."service_type" in ('cloud', 'software', 'data', 'network', 'other'))
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text DEFAULT 'New Conversation' NOT NULL,
	"user_id" uuid,
	"workspace_id" uuid,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"vendor_name" text NOT NULL,
	"framework" "assessment_framework" DEFAULT 'DORA' NOT NULL,
	"status" "assessment_status" DEFAULT 'pending' NOT NULL,
	"status_message" text DEFAULT '' NOT NULL,
	"documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"results" jsonb,
	"report_path" text,
	"risk_decision" jsonb,
	"clause_signoffs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "critical_function_dependencies" (
	"critical_function_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "critical_function_dependencies_critical_function_id_workspace_id_pk" PRIMARY KEY("critical_function_id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "critical_functions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"criticality" "criticality" NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"parent_node_id" uuid NOT NULL,
	"child_node_id" uuid NOT NULL,
	"relationship" text DEFAULT 'sub_processes_via' NOT NULL,
	"source" "provider_source" DEFAULT 'manual' NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"confirmed" boolean DEFAULT true NOT NULL,
	"last_verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" "provider_node_kind" NOT NULL,
	"workspace_id" uuid,
	"canonical_name" text NOT NULL,
	"display_name" text NOT NULL,
	"tier" "tier",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questionnaire_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_questionnaires" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"template_id" uuid,
	"vendor_name" text NOT NULL,
	"vendor_email" text NOT NULL,
	"vendor_contact_name" text DEFAULT '' NOT NULL,
	"token" text,
	"token_expires_at" timestamp with time zone,
	"status" "questionnaire_status" DEFAULT 'draft' NOT NULL,
	"status_message" text DEFAULT '' NOT NULL,
	"sent_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"overall_score" integer,
	"results" jsonb,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "critical_function_dependencies" ADD CONSTRAINT "critical_function_dependencies_critical_function_id_critical_functions_id_fk" FOREIGN KEY ("critical_function_id") REFERENCES "public"."critical_functions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "critical_function_dependencies" ADD CONSTRAINT "critical_function_dependencies_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "critical_functions" ADD CONSTRAINT "critical_functions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "critical_functions" ADD CONSTRAINT "critical_functions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_dependencies" ADD CONSTRAINT "provider_dependencies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_dependencies" ADD CONSTRAINT "provider_dependencies_parent_node_id_provider_nodes_id_fk" FOREIGN KEY ("parent_node_id") REFERENCES "public"."provider_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_dependencies" ADD CONSTRAINT "provider_dependencies_child_node_id_provider_nodes_id_fk" FOREIGN KEY ("child_node_id") REFERENCES "public"."provider_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_dependencies" ADD CONSTRAINT "provider_dependencies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_nodes" ADD CONSTRAINT "provider_nodes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_nodes" ADD CONSTRAINT "provider_nodes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_questionnaires" ADD CONSTRAINT "vendor_questionnaires_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_questionnaires" ADD CONSTRAINT "vendor_questionnaires_template_id_questionnaire_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."questionnaire_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_questionnaires" ADD CONSTRAINT "vendor_questionnaires_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_organization_id_idx" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_members_org_email_uniq" ON "organization_members" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "org_members_user_id_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_ws_user_uniq" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_user_status_idx" ON "workspace_members" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "workspaces_user_id_idx" ON "workspaces" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workspaces_organization_id_idx" ON "workspaces" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "workspaces_user_name_idx" ON "workspaces" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "conversations_user_updated_idx" ON "conversations" USING btree ("user_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "conversations_ws_user_updated_idx" ON "conversations" USING btree ("workspace_id","user_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_idempotency_uniq" ON "conversations" USING btree ("user_id","workspace_id","idempotency_key") WHERE "conversations"."idempotency_key" is not null;--> statement-breakpoint
CREATE INDEX "messages_conversation_timestamp_idx" ON "messages" USING btree ("conversation_id","timestamp");--> statement-breakpoint
CREATE INDEX "assessments_ws_created_idx" ON "assessments" USING btree ("workspace_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "assessments_createdby_status_idx" ON "assessments" USING btree ("created_by","status");--> statement-breakpoint
CREATE UNIQUE INDEX "critical_functions_org_name_uniq" ON "critical_functions" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_deps_edge_uniq" ON "provider_dependencies" USING btree ("parent_node_id","child_node_id","relationship");--> statement-breakpoint
CREATE INDEX "provider_deps_org_idx" ON "provider_dependencies" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "provider_deps_parent_idx" ON "provider_dependencies" USING btree ("parent_node_id");--> statement-breakpoint
CREATE INDEX "provider_deps_child_idx" ON "provider_dependencies" USING btree ("child_node_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_nodes_org_canonical_uniq" ON "provider_nodes" USING btree ("organization_id","canonical_name");--> statement-breakpoint
CREATE INDEX "provider_nodes_org_idx" ON "provider_nodes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "provider_nodes_workspace_idx" ON "provider_nodes" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "questionnaire_templates_is_default_idx" ON "questionnaire_templates" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "vendor_questionnaires_ws_created_idx" ON "vendor_questionnaires" USING btree ("workspace_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "vendor_questionnaires_createdby_status_idx" ON "vendor_questionnaires" USING btree ("created_by","status");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_questionnaires_token_uniq" ON "vendor_questionnaires" USING btree ("token") WHERE "vendor_questionnaires"."token" is not null;