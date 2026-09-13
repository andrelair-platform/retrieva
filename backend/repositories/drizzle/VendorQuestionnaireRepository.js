/**
 * Drizzle VendorQuestionnaireRepository (RTV-49 pt4). Tenant-scoped (workspaceId) for the
 * firm's own CRUD. `findByToken` is deliberately UNSCOPED — it serves the PUBLIC vendor
 * response link, which has no authenticated user and no tenant context. Additive; not wired.
 */
import { eq } from 'drizzle-orm';
import { TenantScopedRepository } from './TenantScopedRepository.js';
import { vendorQuestionnaires } from '../../db/schema/index.js';

export class VendorQuestionnaireRepository extends TenantScopedRepository {
  constructor(opts = {}) {
    super(vendorQuestionnaires, { tenantKey: 'workspaceId', ...opts });
  }

  /** Public response-link lookup — NO tenant scoping (no auth context on this path). */
  async findByToken(token) {
    const [row] = await this.db
      .select()
      .from(vendorQuestionnaires)
      .where(eq(vendorQuestionnaires.token, token))
      .limit(1);
    return row ?? null;
  }
}

export const vendorQuestionnaireRepository = new VendorQuestionnaireRepository();
