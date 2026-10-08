import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    'who-its-for',
    'product-principles',
    'getting-started',
    {
      type: 'category',
      label: 'Strategy & Positioning',
      collapsed: false,
      items: [
        'strategy/product-vision',
        'strategy/product-maturity',
        'strategy/unit-economics',
        'strategy/defensibility-and-moat',
        'strategy/yc-one-pager',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
      items: [
        'architecture/overview',
        'architecture/solution-architecture',
        'architecture/rag-pipeline',
        'architecture/assessment-engine',
        'architecture/semantic-chunking',
        'architecture/multi-tenancy',
        'architecture/llm-model-selection',
        'architecture/ai-infrastructure',
        'architecture/multimodal-ingestion',
        'architecture/prompt-management',
        'architecture/concentration-graph',
        'architecture/dora-tprm-domain-model',
        'architecture/datastore-postgresql',
        'architecture/authorization-model',
      ],
    },
    {
      type: 'category',
      label: 'Backend',
      collapsed: false,
      items: [
        'backend/overview',
        'backend/services',
        'backend/workers',
        'backend/middleware',
        'backend/models',
        'backend/configuration',
      ],
    },
    {
      type: 'category',
      label: 'Frontend',
      collapsed: true,
      items: [
        'frontend/overview',
        'frontend/components',
        'frontend/pricing',
        'frontend/state-management',
        'frontend/hooks',
      ],
    },
    {
      type: 'category',
      label: 'Security',
      collapsed: true,
      items: [
        'security/overview',
        'security/authentication',
        'security/authorization',
        'security/llm-guardrails',
        'security/data-protection',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      collapsed: true,
      items: [
        'deployment/docker',
        'deployment/environment-variables',
        'deployment/production-checklist',
        'deployment/database-capacity',
        'deployment/ci-cd',
        'deployment/email-service',
        'deployment/observability',
      ],
    },
    {
      type: 'category',
      label: 'Certification (RNCP39583)',
      collapsed: false,
      items: [
        'certification/overview',
        {
          type: 'category',
          label: 'Bloc 1 — Cadrer (oral)',
          collapsed: false,
          items: [
            'certification/bc01-cahier-des-charges-fonctionnel',
            'certification/bc01-budget-previsionnel',
            'certification/bc01-support-presentation',
          ],
        },
        {
          type: 'category',
          label: 'Bloc 2 — Concevoir & développer (écrit)',
          collapsed: false,
          items: [
            'certification/bc02-dossier-conception-developpement',
            'certification/bc02-accessibility-audit',
          ],
        },
        {
          type: 'category',
          label: 'Bloc 3 — Coordonner & piloter (oral)',
          collapsed: false,
          items: [
            'certification/bc03-gestion-projet',
          ],
        },
        {
          type: 'category',
          label: 'Bloc 4 — Maintenir en condition opérationnelle (écrit)',
          collapsed: false,
          items: [
            'certification/bc04-maintien-condition-operationnelle',
          ],
        },
      ],
    },
    'contributing',
  ],
  apiSidebar: [
    // Per-endpoint pages were removed (RTV-74): the authoritative, always-current
    // endpoint reference is the auto-generated OpenAPI spec served at /api-docs.
    // Only the overview (which points there) + cross-cutting guides remain.
    'api/overview',
    'api/error-handling',
    'api/rate-limiting',
  ],
};

export default sidebars;
