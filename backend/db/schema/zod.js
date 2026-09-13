// drizzle-zod DTO schemas (RTV-48, AC-3). Each table relates to a Zod insert/select
// schema so the app's DTO types derive from the tables (Zod stays the single source of
// truth — no duplicate hand-written shapes). Consumed by validators/services at RTV-49.
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import {
  users,
  organizations,
  organizationMembers,
  workspaces,
  workspaceMembers,
  conversations,
  messages,
  assessments,
  criticalFunctions,
  criticalFunctionDependencies,
  providerDependencies,
  questionnaireTemplates,
  vendorQuestionnaires,
} from './index.js';

export const userInsertSchema = createInsertSchema(users);
export const userSelectSchema = createSelectSchema(users);

export const organizationInsertSchema = createInsertSchema(organizations);
export const organizationSelectSchema = createSelectSchema(organizations);
export const organizationMemberInsertSchema = createInsertSchema(organizationMembers);
export const organizationMemberSelectSchema = createSelectSchema(organizationMembers);

export const workspaceInsertSchema = createInsertSchema(workspaces);
export const workspaceSelectSchema = createSelectSchema(workspaces);
export const workspaceMemberInsertSchema = createInsertSchema(workspaceMembers);
export const workspaceMemberSelectSchema = createSelectSchema(workspaceMembers);

export const conversationInsertSchema = createInsertSchema(conversations);
export const conversationSelectSchema = createSelectSchema(conversations);
export const messageInsertSchema = createInsertSchema(messages);
export const messageSelectSchema = createSelectSchema(messages);

export const assessmentInsertSchema = createInsertSchema(assessments);
export const assessmentSelectSchema = createSelectSchema(assessments);

export const criticalFunctionInsertSchema = createInsertSchema(criticalFunctions);
export const criticalFunctionSelectSchema = createSelectSchema(criticalFunctions);
export const criticalFunctionDependencyInsertSchema = createInsertSchema(
  criticalFunctionDependencies
);

export const providerDependencyInsertSchema = createInsertSchema(providerDependencies);
export const providerDependencySelectSchema = createSelectSchema(providerDependencies);

export const questionnaireTemplateInsertSchema = createInsertSchema(questionnaireTemplates);
export const questionnaireTemplateSelectSchema = createSelectSchema(questionnaireTemplates);
export const vendorQuestionnaireInsertSchema = createInsertSchema(vendorQuestionnaires);
export const vendorQuestionnaireSelectSchema = createSelectSchema(vendorQuestionnaires);
