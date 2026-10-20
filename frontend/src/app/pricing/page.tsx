'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { PricingSection } from '@/components/marketing/pricing-section';

const FAQ_ITEMS = [
  {
    question: 'Is Retrieva software or a service?',
    answer:
      'Both, and you choose which. On Supervised you run the AI agent workforce yourself and your ICT risk officer signs off. On Managed and Enterprise it becomes a service: the agents still do ~95% of the work, and our DORA Compliance Analysts and legal experts review every output, sign off on the risk ratings, and defend your Register in a regulatory audit.',
  },
  {
    question: 'What do I actually hand over?',
    answer:
      'Raw data — contracts, invoices, vendor lists, or just read-only access to your source systems. There is no data-entry burden: the agents parse, map, assess, and draft. You stay accountable for every provider; we make the gaps explicit and tracked.',
  },
  {
    question: 'What does the outcome SLA guarantee?',
    answer:
      'On Managed and Enterprise you buy an outcome, not a licence: an audit-ready Register of Information (EBA RT.01–RT.04), DORA-compliant contract amendments, and tested exit strategies for your critical-or-important functions — reviewed and signed off by our experts and defensible in front of the regulator.',
  },
  {
    question: 'Who signs off on the risk ratings?',
    answer:
      'On Supervised, your own ICT risk officer — the AI drafts, your team decides. On Managed and Enterprise, our DORA analysts review and sign off, with your management body retaining ultimate accountability (maker-checker and an immutable audit trail apply on every tier).',
  },
  {
    question: 'Can I start without talking to sales?',
    answer:
      'Yes. Supervised has a 20-day free trial — no credit card to start. Move up to Managed when you want our experts to own the review and guarantee the outcome.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Retrieva</span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/pricing">
              <Button variant="ghost" className="font-semibold">
                Pricing
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Pricing section */}
      <PricingSection />

      {/* FAQ */}
      <section className="container mx-auto px-4 py-16 max-w-3xl">
        <h2 className="text-2xl font-bold text-center mb-8">Frequently asked questions</h2>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.question}
              className="group border rounded-lg overflow-hidden"
            >
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium select-none list-none">
                {item.question}
                <span className="text-muted-foreground transition-transform group-open:rotate-180 ml-4 shrink-0">
                  ▾
                </span>
              </summary>
              <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>
            &copy; {new Date().getFullYear()} Retrieva.{' '}
            <span>Built for DORA (Regulation EU 2022/2554) compliance.</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
