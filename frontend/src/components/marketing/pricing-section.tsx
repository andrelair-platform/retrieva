'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Billing = 'monthly' | 'annual';

interface Plan {
  name: string;
  monthly: string;
  annual: string;
  monthlyRaw: number | null;
  annualRaw: number | null;
  vendors: string;
  members: string;
  support: string;
  trial: string;
  highlighted: boolean;
  badge?: string;
  ctaLabel: string;
  ctaHref: string;
}

// The ONLY axes that actually vary by plan — vendors + seats are enforced by config/stripe.ts
// PLAN_LIMITS (Stripe-wired); support + trial are the ops differences. Every capability below the
// cards is included on all plans, so we don't fake feature gates that the product doesn't enforce.
const PLANS: Plan[] = [
  {
    name: 'Starter',
    monthly: '€199',
    annual: '€159',
    monthlyRaw: 199,
    annualRaw: 159,
    vendors: 'Up to 10',
    members: '3',
    support: 'Email',
    trial: '20-day free trial',
    highlighted: false,
    ctaLabel: 'Start free trial',
    ctaHref: '/register',
  },
  {
    name: 'Professional',
    monthly: '€499',
    annual: '€399',
    monthlyRaw: 499,
    annualRaw: 399,
    vendors: 'Up to 50',
    members: '10',
    support: 'Priority email',
    trial: '20-day free trial',
    highlighted: true,
    badge: 'Most Popular',
    ctaLabel: 'Start free trial',
    ctaHref: '/register',
  },
  {
    name: 'Business',
    monthly: '€999',
    annual: '€799',
    monthlyRaw: 999,
    annualRaw: 799,
    vendors: 'Up to 150',
    members: '30',
    support: 'Slack + SLA',
    trial: '20-day free trial',
    highlighted: false,
    ctaLabel: 'Start free trial',
    ctaHref: '/register',
  },
  {
    name: 'Enterprise',
    monthly: 'Custom',
    annual: 'Custom',
    monthlyRaw: null,
    annualRaw: null,
    vendors: 'Unlimited',
    members: 'Unlimited',
    support: 'Dedicated CSM',
    trial: 'Guided POC',
    highlighted: false,
    ctaLabel: 'Contact Sales',
    ctaHref: '/contact',
  },
];

// "Included on every plan" — each item is a capability that actually ships today (verified in the
// codebase). Priced by the size of the estate, not by locking capabilities behind higher tiers.
const INCLUDED: { title: string; detail: string }[] = [
  { title: 'Unlimited DORA gap assessments', detail: 'Art. 28/30 controls, evidence-grounded verdicts' },
  { title: 'Register of Information export', detail: 'EBA RT.02.01 template (XLSX & CSV), gaps sheet' },
  { title: 'Vendor questionnaires', detail: 'DORA due-diligence, scored automatically' },
  { title: 'Vendor evidence portal', detail: 'Vendors upload requested documents — no account needed' },
  { title: 'Nth-party dependency mapping', detail: 'Subcontractor chains, not just direct providers' },
  { title: 'Concentration-risk analysis', detail: 'Spot single points of failure across the estate' },
  { title: 'AI Copilot', detail: 'Ask your evidence base in plain language (RAG, cited)' },
  { title: 'Certificate & contract alerts', detail: 'Expiry warnings before they lapse' },
  { title: 'Maker-checker + immutable audit', detail: 'Segregation of duties, append-only trail' },
  { title: 'Role-based access control', detail: 'Scoped permissions per team member' },
];

interface FeatureRowProps {
  label: string;
  value: string | React.ReactNode;
}

function FeatureRow({ label, value }: FeatureRowProps) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right max-w-[55%]">{value}</span>
    </div>
  );
}

export function PricingSection() {
  const [billing, setBilling] = useState<Billing>('monthly');

  return (
    <section className="container mx-auto px-4 py-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Simple, transparent pricing</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
          Every capability on every plan — you only pay for the size of your third-party estate.
          20-day free trial, no credit card required to start.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center rounded-full border p-1 bg-muted/50">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              billing === 'monthly'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('annual')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
              billing === 'annual'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Annual
            <span className="text-xs font-semibold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-full">
              -20%
            </span>
          </button>
        </div>
      </div>

      {/* 4-card grid — cards show ONLY what varies by plan */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className={`relative rounded-xl p-6 flex flex-col ${
              plan.highlighted ? 'ring-2 ring-primary bg-card shadow-lg' : 'border bg-card'
            }`}
          >
            {plan.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground whitespace-nowrap">
                {plan.badge}
              </span>
            )}

            <h3 className="font-semibold text-lg mb-1">{plan.name}</h3>

            <div className="mb-6">
              {plan.monthlyRaw === null ? (
                <div className="text-4xl font-bold">Custom</div>
              ) : (
                <>
                  <div className="text-4xl font-bold">
                    {billing === 'monthly' ? plan.monthly : plan.annual}
                    <span className="text-base font-normal text-muted-foreground">/mo</span>
                  </div>
                  {billing === 'annual' && (
                    <p className="text-xs text-muted-foreground mt-1">billed annually</p>
                  )}
                </>
              )}
            </div>

            <div className="flex-1 space-y-0">
              <FeatureRow label="Vendors managed" value={plan.vendors} />
              <FeatureRow label="Team members" value={plan.members} />
              <FeatureRow label="Support" value={plan.support} />
              <FeatureRow label="Onboarding" value={plan.trial} />
            </div>

            <p className="text-[11px] text-muted-foreground mt-3 mb-1">
              + every capability below, included
            </p>

            <Link href={plan.ctaHref} className="mt-3">
              <Button
                size="lg"
                variant={plan.highlighted ? 'default' : 'outline'}
                className="w-full"
              >
                {plan.ctaLabel}
              </Button>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Everything included — the real capability set, on every plan */}
      <div className="mt-14 rounded-xl border bg-card/50 p-8">
        <h3 className="text-lg font-semibold text-center mb-1">Included on every plan</h3>
        <p className="text-sm text-muted-foreground text-center mb-8 max-w-xl mx-auto">
          No feature paywalls. Starter and Enterprise run the same DORA platform — the difference is
          how many third parties you manage and the support you need.
        </p>
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
