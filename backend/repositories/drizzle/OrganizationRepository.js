/**
 * Drizzle OrganizationRepository (RTV-49 pt3). Plain base — organizations is not a
 * tenant table. Additive; not wired into services yet (Mongoose still serves).
 */
import { eq } from 'drizzle-orm';
import { BaseDrizzleRepository } from './BaseDrizzleRepository.js';
import { organizations } from '../../db/schema/index.js';

export class OrganizationRepository extends BaseDrizzleRepository {
  constructor(opts = {}) {
    super(organizations, opts);
  }

  async findByStripeCustomerId(stripeCustomerId) {
    return this.findOne(eq(organizations.stripeCustomerId, stripeCustomerId));
  }
}

export const organizationRepository = new OrganizationRepository();
