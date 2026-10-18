'use client';

/**
 * Agent-surface placeholder (redesign 2026-10, Phase 1).
 *
 * Honest placeholder for the four autonomous agents now surfaced in the nav (discovery, CTPP
 * surveillance, exit strategy, contract redliner). Their backends are LIVE; their draft output
 * already lands in the Decision Inbox. These pages make the agent legible — what it does + the
 * human-in-the-loop contract — until Phase 3 wires each a dedicated live view. No fabricated data.
 */
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Inbox, Check, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface AgentSurfaceProps {
  /** key under commandCenter.agents.* and agentSurface.* (surveillance | discovery | exit | redliner) */
  agentKey: string;
  /** i18n key under agentSurface.* for the bullet array (returnObjects) */
  bulletsKey: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}

export function AgentSurfacePlaceholder({
  agentKey,
  bulletsKey,
  icon: Icon,
  accent = 'text-primary',
}: AgentSurfaceProps) {
  const { t } = useTranslation();
  const bullets = t(`agentSurface.${bulletsKey}`, { returnObjects: true });
  const items = Array.isArray(bullets) ? (bullets as string[]) : [];

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-5 sm:p-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl bg-sidebar px-6 py-7 text-sidebar-foreground sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative flex items-start gap-4">
          <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent/60', accent)}>
            <Icon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-success">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              {t('agentSurface.badge')}
            </span>
            <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {t(`commandCenter.agents.${agentKey}.name`)}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-sidebar-foreground/70">
              {t(`commandCenter.agents.${agentKey}.desc`)}
            </p>
          </div>
        </div>
      </section>

      {/* What it does */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <h2 className="font-display text-base font-semibold tracking-tight">
            {t('agentSurface.whatItDoes')}
          </h2>
          <ul className="mt-3 space-y-2.5">
            {items.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-muted text-success">
                  <Check className="h-3 w-3" />
                </span>
                <span className="text-sm text-foreground">{b}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* HITL contract + CTA */}
      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Inbox className="h-4 w-4" />
            </span>
            <p className="max-w-xl text-sm text-muted-foreground">{t('agentSurface.hitl')}</p>
          </div>
          <Button asChild className="shrink-0">
            <Link href="/decision-inbox">
              {t('agentSurface.openInbox')}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Coming-soon note */}
      <p className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground/60" />
        {t('agentSurface.comingSoon')}
      </p>
    </div>
  );
}
