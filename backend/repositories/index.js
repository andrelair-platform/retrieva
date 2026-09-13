/**
 * Repository Layer — Barrel Export (RTV-49 pt5 — now Drizzle/Postgres).
 *
 * Re-exports the Drizzle repository singletons + classes. The Mongoose repos were removed
 * in the cutover; these are the SQL-first repos (see repositories/drizzle/). Method shapes
 * changed (Drizzle `where` conditions + intent-named methods, not Mongo criteria).
 */
export { BaseDrizzleRepository } from './drizzle/BaseDrizzleRepository.js';
export { TenantScopedRepository } from './drizzle/TenantScopedRepository.js';

export { UserRepository, userRepository } from './drizzle/UserRepository.js';
export { OrganizationRepository, organizationRepository } from './drizzle/OrganizationRepository.js';
export {
  OrganizationMemberRepository,
  organizationMemberRepository,
} from './drizzle/OrganizationMemberRepository.js';
export { WorkspaceRepository, workspaceRepository } from './drizzle/WorkspaceRepository.js';
export {
  WorkspaceMemberRepository,
  workspaceMemberRepository,
} from './drizzle/WorkspaceMemberRepository.js';
export {
  ConversationRepository,
  conversationRepository,
} from './drizzle/ConversationRepository.js';
export { MessageRepository, messageRepository } from './drizzle/MessageRepository.js';
export { AssessmentRepository, assessmentRepository } from './drizzle/AssessmentRepository.js';
export {
  QuestionnaireTemplateRepository,
  questionnaireTemplateRepository,
} from './drizzle/QuestionnaireTemplateRepository.js';
export {
  VendorQuestionnaireRepository,
  vendorQuestionnaireRepository,
} from './drizzle/VendorQuestionnaireRepository.js';
export {
  CriticalFunctionRepository,
  criticalFunctionRepository,
} from './drizzle/CriticalFunctionRepository.js';
export {
  ProviderGraphRepository,
  providerGraphRepository,
} from './drizzle/ProviderGraphRepository.js';
