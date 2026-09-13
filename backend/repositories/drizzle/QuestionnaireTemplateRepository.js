/**
 * Drizzle QuestionnaireTemplateRepository (RTV-49 pt3). Global templates (not tenant).
 * Additive; not wired yet.
 */
import { eq } from 'drizzle-orm';
import { BaseDrizzleRepository } from './BaseDrizzleRepository.js';
import { questionnaireTemplates } from '../../db/schema/index.js';

export class QuestionnaireTemplateRepository extends BaseDrizzleRepository {
  constructor(opts = {}) {
    super(questionnaireTemplates, opts);
  }

  async findDefault() {
    return this.findOne(eq(questionnaireTemplates.isDefault, true));
  }
}

export const questionnaireTemplateRepository = new QuestionnaireTemplateRepository();
