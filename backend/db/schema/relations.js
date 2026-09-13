// Drizzle relations (RTV-48) — the app-level graph for the `db.query` relational API,
// replacing Mongoose `.populate()`. Relations are query-time only (no DDL impact).
// Ambiguous pairs (two FKs between the same tables) use explicit `relationName`.
import { relations } from 'drizzle-orm';
import { users } from './users.js';
import { organizations, organizationMembers } from './organizations.js';
import { workspaces, workspaceMembers } from './workspaces.js';
import { conversations, messages } from './conversations.js';
import { assessments } from './assessments.js';
import { criticalFunctions, criticalFunctionDependencies } from './criticalFunctions.js';
import { providerNodes, providerDependencies } from './providerDependencies.js';
import { questionnaireTemplates, vendorQuestionnaires } from './questionnaires.js';

export const usersRelations = relations(users, ({ one, many }) => ({
  // user.organizationId → organizations (the org the user belongs to)
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
    relationName: 'org_membership',
  }),
  // organizations this user owns (organizations.ownerId)
  ownedOrganizations: many(organizations, { relationName: 'org_owner' }),
  ownedWorkspaces: many(workspaces),
  workspaceMemberships: many(workspaceMembers),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, {
    fields: [organizations.ownerId],
    references: [users.id],
    relationName: 'org_owner',
  }),
  members: many(organizationMembers),
  workspaces: many(workspaces),
  criticalFunctions: many(criticalFunctions),
  providerNodes: many(providerNodes),
  providerDependencies: many(providerDependencies),
  // reciprocal of users.organization
  users: many(users, { relationName: 'org_membership' }),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, { fields: [workspaces.userId], references: [users.id] }),
  organization: one(organizations, {
    fields: [workspaces.organizationId],
    references: [organizations.id],
  }),
  members: many(workspaceMembers),
  assessments: many(assessments),
  vendorQuestionnaires: many(vendorQuestionnaires),
  conversations: many(conversations),
  providerNodes: many(providerNodes),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, { fields: [workspaceMembers.userId], references: [users.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  workspace: one(workspaces, {
    fields: [conversations.workspaceId],
    references: [workspaces.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const assessmentsRelations = relations(assessments, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [assessments.workspaceId],
    references: [workspaces.id],
  }),
  createdByUser: one(users, { fields: [assessments.createdBy], references: [users.id] }),
}));

export const criticalFunctionsRelations = relations(criticalFunctions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [criticalFunctions.organizationId],
    references: [organizations.id],
  }),
  dependencies: many(criticalFunctionDependencies),
}));

export const criticalFunctionDependenciesRelations = relations(
  criticalFunctionDependencies,
  ({ one }) => ({
    criticalFunction: one(criticalFunctions, {
      fields: [criticalFunctionDependencies.criticalFunctionId],
      references: [criticalFunctions.id],
    }),
    workspace: one(workspaces, {
      fields: [criticalFunctionDependencies.workspaceId],
      references: [workspaces.id],
    }),
  })
);

export const providerNodesRelations = relations(providerNodes, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [providerNodes.organizationId],
    references: [organizations.id],
  }),
  workspace: one(workspaces, {
    fields: [providerNodes.workspaceId],
    references: [workspaces.id],
  }),
  // edges where this node is the parent / child
  outgoingEdges: many(providerDependencies, { relationName: 'edge_parent' }),
  incomingEdges: many(providerDependencies, { relationName: 'edge_child' }),
}));

export const providerDependenciesRelations = relations(providerDependencies, ({ one }) => ({
  organization: one(organizations, {
    fields: [providerDependencies.organizationId],
    references: [organizations.id],
  }),
  parentNode: one(providerNodes, {
    fields: [providerDependencies.parentNodeId],
    references: [providerNodes.id],
    relationName: 'edge_parent',
  }),
  childNode: one(providerNodes, {
    fields: [providerDependencies.childNodeId],
    references: [providerNodes.id],
    relationName: 'edge_child',
  }),
}));

export const questionnaireTemplatesRelations = relations(questionnaireTemplates, ({ many }) => ({
  vendorQuestionnaires: many(vendorQuestionnaires),
}));

export const vendorQuestionnairesRelations = relations(vendorQuestionnaires, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [vendorQuestionnaires.workspaceId],
    references: [workspaces.id],
  }),
  template: one(questionnaireTemplates, {
    fields: [vendorQuestionnaires.templateId],
    references: [questionnaireTemplates.id],
  }),
}));
