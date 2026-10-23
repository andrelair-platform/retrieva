'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, UserCheck, Bot, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Service-ladder pricing (redesign 2026-10; experts-claim corrected 2026-10) — Retrieva is an
// AI-native SERVICE, not a SaaS tool. The client hands over raw data; the agents do ~95%; the
// client's OWN DORA/ICT-risk officer always signs off (there is no Retrieva-staffed expert team).
// The tier chooses the SERVICE LEVEL (self-serve → hands-on → enterprise). Priced by the estate.
interface Plan {
  name: string;
  tagline: string;
  price: string;
  priceNote: string;
  /** who reviews the AI's output and signs off — always the CLIENT's own officer. */
  reviewer: string;
  /** the service-level SLA for the tier (onboarding/support/availability — not a compliance outcome). */
  sla: string;
  estate: string;
  onboarding: string;
  highlighted: boolean;
  badge?: string;
  /** the managed-service promise (Managed/Enterprise only). */
  managedNote?: string;
  ctaLabel: string;
  ctaHref: string;
}

const PLANS: Plan[] = [
  {
    name: 'Supervised',
    tagline: 'The AI agent workforce — your team reviews and signs off',
    price: 'From €499',
    priceNote: '/mo · scales with your estate',
    estate: 'Scales with your third-party estate',
    reviewer: 'Your ICT risk officer',
    sla: 'Self-managed — you own the sign-off',
    onboarding: '20-day free trial',
    highlighted: false,
    ctaLabel: 'Start free trial',
    ctaHref: '/register',
  },
  {
    name: 'Managed',
    tagline: 'AI agents + your expert — we set it up and run it with you',
    price: "Let's scope it",
    priceNote: 'hands-on engagement',
    estate: 'Scales with your third-party estate',
    reviewer: 'Your DORA / ICT-risk officer',
    sla: 'Guided onboarding + priority SLA',
    onboarding: 'Guided onboarding',
    highlighted: true,
    badge: 'Hands-on',
    managedNote:
      'You hand over raw data; the agents do ~95%. We set Retrieva up for your estate, wire your source systems, and run it with you — guided onboarding, a dedicated success manager, and priority support. Your own DORA / ICT-risk officer reviews and signs off; you keep accountability.',
    ctaLabel: 'Talk to us',
    ctaHref: '/contact',
  },
  {
    name: 'Enterprise / Group',
    tagline: 'Multi-entity groups, with SSO and self-hosting',
    price: 'Custom',
    priceNote: 'annual engagement',
    estate: 'Unlimited · multi-entity, cross-border',
    reviewer: 'Your team + a dedicated CSM',
    sla: 'Custom SLA · SSO · self-hosting',
    onboarding: 'Guided proof-of-concept',
    highlighted: false,
    managedNote:
      'For insurance/banking groups running DORA across country entities: consolidated and per-entity registers, SSO, self-hosting options, a dedicated customer success manager, and a custom SLA. Your team keeps the sign-off.',
    ctaLabel: 'Talk to us',
    ctaHref: '/contact',
  },
];

// The AI workforce runs on EVERY tier — these are real, shipped capabilities (verified in the
// codebase). What changes up the ladder is WHO reviews/signs off/defends and the outcome SLA.
const INCLUDED: { title: string; detail: string }[] = [
  { title: 'Autonomous discovery & assessment', detail: 'Agents find your ICT third parties and grade them against DORA' },
  { title: 'Register of Information', detail: 'EBA RT.01–RT.04, kept current from the live graph' },
  { title: 'Contract redlining (Art. 30)', detail: 'Draft amendment clauses for every missing obligation' },
  { title: 'Exit strategies', detail: 'Substitute providers + tested exit blueprints for CIFs' },
  { title: 'Continuous CTPP surveillance', detail: 'Provider incidents + CVEs, blast-radius mapped' },
  { title: 'Vendor due-diligence & DDQs', detail: 'Tokenized questionnaires, scored — no vendor account' },
  { title: 'Nth-party & concentration graph', detail: 'Subcontractor chains and single points of failure' },
  { title: 'Maker-checker + immutable audit', detail: 'Segregation of duties, append-only trail' },
];

interface FeatureRowProps {
  label: string;
  value: string | React.ReactNode;
}

function FeatureRow({ label, value }: FeatureRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-2.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}

export function PricingSection() {
  return (
    <section className="container mx-auto px-4 py-24">
      <div className="text-center mb-14">
        <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Priced around the outcome, not seats
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          You hand over raw data; the AI agents do ~95% of the work. Choose how much you want to own —
          run the agents yourself, or have us set Retrieva up and run it with you. Your own DORA /
          ICT-risk officer always keeps the sign-off. You pay for the size of your estate, never per seat.
        </p>
      </div>

      {/* 3 service tiers — the ladder from supervised-platform to fully-managed. */}
      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {PLANS.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className={`relative rounded-2xl p-6 flex flex-col ${
              plan.highlighted ? 'ring-2 ring-primary bg-card shadow-lg' : 'border bg-card'
            }`}
          >
            {plan.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground whitespace-nowrap">
                {plan.badge}
              </span>
            )}

            <h3 className="font-display font-semibold text-lg mb-0.5">{plan.name}</h3>
            <p className="text-xs text-muted-foreground mb-5 min-h-8">{plan.tagline}</p>

            <div className="mb-5">
              <div className="font-display text-3xl font-bold tracking-tight">{plan.price}</div>
              <p className="text-xs text-muted-foreground mt-1">{plan.priceNote}</p>
            </div>

            <div className="flex-1">
              <FeatureRow
                label="Reviews & signs off"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    {plan.name === 'Supervised' ? (
                      <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <UserCheck className="h-3.5 w-3.5 text-primary" />
                    )}
                    {plan.reviewer}
                  </span>
                }
              />
              <FeatureRow label="Outcome SLA" value={plan.sla} />
              <FeatureRow label="Estate" value={plan.estate} />
              <FeatureRow label="Onboarding" value={plan.onboarding} />
            </div>

            {plan.managedNote && (
              <p className="mt-4 rounded-lg bg-primary/[0.05] border border-primary/15 p-3 text-xs text-muted-foreground leading-relaxed">
                {plan.managedNote}
              </p>
            )}

            <p className="text-[11px] text-muted-foreground mt-4 mb-1">
              + the full AI agent workforce, below
            </p>

            <Link href={plan.ctaHref} className="mt-3">
              <Button size="lg" variant={plan.highlighted ? 'default' : 'outline'} className="w-full">
                {plan.ctaLabel}
              </Button>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* The AI workforce — included on every tier; the ladder only changes the human layer. */}
      <div className="mt-14 rounded-2xl border bg-card/50 p-8 max-w-6xl mx-auto">
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <ShieldCheck className="h-8 w-8 text-primary mx-auto mb-3" />
          <h3 className="font-display text-lg font-semibold mb-1">Every tier runs the full AI agent workforce</h3>
          <p className="text-sm text-muted-foreground">
            The agents — discovery, assessment, DDQs, contract redlining, exit strategy, surveillance —
            run on every tier. <span className="text-foreground font-medium">Managed and Enterprise add
            hands-on onboarding, a dedicated success manager and a priority SLA</span> — we help you run
            it; your own officer keeps the sign-off. You never lose a capability by running a smaller estate.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
          {INCLUDED.map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium leading-snug">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-snug">{f.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
