/**
 * Drizzle WorkspaceRepository (RTV-49 pt3). A workspace is the tenant ROOT (its own id
 * is the tenant key), so it's not auto-scoped by workspace here — access is gated by
 * membership at the service layer. `certifications` is a JSONB array → the cert queries
 * use jsonb operators. Additive; not wired yet.
 */
import { and, eq, gte, lte, isNotNull, inArray, sql, desc } from 'drizzle-orm';
import { BaseDrizzleRepository } from './BaseDrizzleRepository.js';
import { workspaces } from '../../db/schema/index.js';

export class WorkspaceRepository extends BaseDrizzleRepository {
  constructor(opts = {}) {
    super(workspaces, opts);
  }

  async findByOrganization(organizationId, { orderBy } = {}) {
    return this.find(eq(workspaces.organizationId, organizationId), {
      orderBy: orderBy ?? desc(workspaces.createdAt),
    });
  }

  /** Workspaces with at least one certification (JSONB array non-empty). */
  async findWithCertifications() {
    return this.find(sql`jsonb_array_length(${workspaces.certifications}) > 0`);
  }

  /** Workspaces where any certification's validUntil is on/before the threshold. */
  async findWithExpiringCertifications(thresholdDate) {
    const iso = new Date(thresholdDate).toISOString();
    return this.find(
      sql`exists (
        select 1 from jsonb_array_elements(${workspaces.certifications}) as c
        where (c->>'validUntil')::timestamptz <= ${iso}::timestamptz
      )`
    );
  }

  async findByContractEndingSoon(from, to) {
    return this.find(
      and(
        isNotNull(workspaces.contractEnd),
        gte(workspaces.contractEnd, from),
        lte(workspaces.contractEnd, to)
      )
    );
  }

  async findDueForReview(asOf = new Date()) {
    return this.find(
      and(isNotNull(workspaces.nextReviewDate), sql`${workspaces.nextReviewDate} < ${asOf}`)
    );
  }

  async setNextReviewDate(id, nextReviewDate) {
    return this.updateById(id, { nextReviewDate });
  }

  async findByOrgAndName(organizationId, name) {
    return this.findOne(
      and(eq(workspaces.organizationId, organizationId), eq(workspaces.name, name))
    );
  }

  async findByIds(ids) {
    if (!ids || ids.length === 0) return [];
    return this.find(inArray(workspaces.id, ids.map(String)));
  }

  /** Merge one key into the alertsSentAt JSONB map (dedup bookkeeping). */
  async setAlertSentAt(workspaceId, alertKey, date = new Date()) {
    return this.updateById(workspaceId, {
      alertsSentAt: sql`coalesce(${workspaces.alertsSentAt}, '{}'::jsonb) || jsonb_build_object(${alertKey}::text, to_jsonb(${date.toISOString()}::text))`,
    });
  }
}

export const workspaceRepository = new WorkspaceRepository();
