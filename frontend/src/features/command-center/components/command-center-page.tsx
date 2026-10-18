'use client';

/**
 * Command Center — the dashboard home (redesign 2026-10).
 *
 * The mission-control surface that leads with the AI-native story: your DORA third-party risk, live.
 * Three bands:
 *   1. a dark hero with the live risk posture derived from the org-wide decision queue;
 *   2. "What needs you" — the highest-urgency items awaiting a human decision (the HITL trust boundary);
 *   3. "Your always-on agents" — the autonomous agents the backend runs (discovery, surveillance,
 *      DDQ, contract redliner, exit strategy, the DORA score engine). Agents propose; the analyst
 *      disposes — nothing here is auto-applied.
 *
 * Grounded in real data (the decision queue is org-wide); the agent cards are navigational surfaces,
 * not fabricated metrics.
 */
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  Radio,
  Radar,
  ClipboardCheck,
  FileSignature,
  DoorOpen,
  Gauge,
  Inbox,
  ArrowRight,
  AlertTriangle,
  ShieldCheck,
  BookText,
  Building2,
  MessageSquare,
  Plus,
  CheckCircle2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDecisionQueueQuery } from '@/features/decision-inbox/queries/use-decision-inbox';
import type { DecisionItem } from '@/features/decision-inbox/api/decision-inbox';
import type { RiskSeverity } from '@/features/arrangements/api/arrangements';

// ── The always-on agents (each is a real backend capability; the href is its UI surface) ──────────
const AGENTS: Array<{
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  accent: string; // tailwind text colour for the icon
}> = [
  { key: 'discovery', icon: Radio, href: '/discovery', accent: 'text-chart-1' },
  { key: 'surveillance', icon: Radar, href: '/surveillance', accent: 'text-chart-3' },
  { key: 'ddq', icon: ClipboardCheck, href: '/questionnaires', accent: 'text-chart-4' },
  { key: 'redliner', icon: FileSignature, href: '/contract-amendments', accent: 'text-chart-2' },
  { key: 'exit', icon: DoorOpen, href: '/exit-strategy', accent: 'text-chart-5' },
  { key: 'score', icon: Gauge, href: '/risk-register', accent: 'text-primary' },
];

type Band = 'clear' | 'low' | 'amber' | 'red';

const SEVERITY_ORDER: RiskSeverity[] = ['critical', 'high', 'medium', 'low'];

function computePosture(items: DecisionItem[]) {
  const bySeverity: Record<RiskSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  let findings = 0;
  let risks = 0;
  for (const it of items) {
    if (it.kind === 'risk') {
      risks += 1;
      const sev = (it.severity ?? 'low') as RiskSeverity;
      if (sev in bySeverity) bySeverity[sev] += 1;
    } else {
      findings += 1;
    }
  }
  const band: Band = bySeverity.critical
    ? 'red'
    : bySeverity.high
      ? 'amber'
      : risks + findings > 0
        ? 'low'
        : 'clear';
  return { bySeverity, findings, risks, band, total: items.length };
}

const BAND_STYLES: Record<Band, { dot: string; ring: string; label: string }> = {
  clear: { dot: 'bg-success', ring: 'ring-success/30', label: 'text-success' },
  low: { dot: 'bg-info', ring: 'ring-info/30', label: 'text-info' },
  amber: { dot: 'bg-warning', ring: 'ring-warning/30', label: 'text-warning' },
  red: { dot: 'bg-destructive', ring: 'ring-destructive/30', label: 'text-destructive' },
};

const SEVERITY_DOT: Record<RiskSeverity, string> = {
  critical: 'bg-destructive',
  high: 'bg-warning',
  medium: 'bg-chart-3',
  low: 'bg-info',
};

export function CommandCenterPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useDecisionQueueQuery();

  const items = data?.items ?? [];
  const posture = computePosture(items);
  const topItems = items.slice(0, 5);
  const bandStyle = BAND_STYLES[posture.band];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6">
      {/* ── Hero — dark mission-control band ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-xl bg-sidebar px-6 py-7 text-sidebar-foreground shadow-sm sm:px-8 sm:py-9">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/50">
              {t('commandCenter.kicker')}
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('nav.titles.commandCenter')}
            </h1>
            <p className="max-w-xl text-sm text-sidebar-foreground/70">
              {t('commandCenter.subtitle')}
            </p>
          </div>

          {/* live posture readout */}
          <div
            className={cn(
              'shrink-0 rounded-lg bg-sidebar-accent/60 px-5 py-4 ring-1',
              bandStyle.ring
            )}
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={cn(
                    'absolute inline-flex h-full w-full animate-ping rounded-full opacity-60',
                    bandStyle.dot
                  )}
                />
                <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', bandStyle.dot)} />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-sidebar-foreground/60">
                {t('commandCenter.posture.title')}
              </span>
            </div>
            {isLoading ? (
              <Skeleton className="mt-3 h-8 w-40 bg-sidebar-foreground/10" />
            ) : posture.band === 'clear' ? (
              <p className={cn('mt-2 font-display text-xl font-semibold', bandStyle.label)}>
                {t('commandCenter.posture.clear')}
              </p>
            ) : (
              <p className="mt-2 font-display text-xl font-semibold">
                <span className={bandStyle.label}>{posture.total}</span>{' '}
                <span className="text-sidebar-foreground/70 text-sm font-normal">
                  {t('commandCenter.posture.needsReview', { count: posture.total })}
                </span>
              </p>
            )}
            {/* severity chips */}
            <div className="mt-3 flex flex-wrap gap-2">
              {SEVERITY_ORDER.filter((s) => posture.bySeverity[s] > 0).map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 rounded-md bg-sidebar/60 px-2 py-1 font-mono text-[11px] text-sidebar-foreground/80"
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', SEVERITY_DOT[s])} />
                  {posture.bySeverity[s]} {t(`commandCenter.posture.${s}`)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── What needs you + posture breakdown ─────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* What needs you (spans 2) */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Inbox className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-base font-semibold tracking-tight">
                    {t('commandCenter.needsYou.title')}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {t('commandCenter.needsYou.subtitle')}
                  </p>
                </div>
              </div>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link href="/decision-inbox">
                  {t('commandCenter.needsYou.viewAll')}
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-2.5">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : topItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
                <CheckCircle2 className="h-7 w-7 text-success" />
                <p className="text-sm text-muted-foreground">
                  {t('commandCenter.needsYou.empty')}
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {topItems.map((it) => (
                  <li key={`${it.kind}-${it.id}`}>
                    <Link
                      href={`/arrangements/${it.arrangementId}`}
                      className="group flex items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                          it.kind === 'risk'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-warning-muted text-warning'
                        )}
                      >
                        {it.kind === 'risk' ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {it.title || it.providerName || it.businessFunctionName || it.controlId}
                        </p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          {it.kind === 'risk'
                            ? t('commandCenter.needsYou.risk')
                            : t('commandCenter.needsYou.finding')}
                          {it.providerName ? ` · ${it.providerName}` : ''}
                          {it.controlId ? ` · ${it.controlId}` : ''}
                        </p>
                      </div>
                      {it.kind === 'risk' && it.severity && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                          <span className={cn('h-1.5 w-1.5 rounded-full', SEVERITY_DOT[it.severity])} />
                          {t(`commandCenter.posture.${it.severity}`)}
                        </span>
                      )}
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Posture breakdown */}
        <Card>
          <CardContent className="p-5">
            <h2 className="font-display text-base font-semibold tracking-tight">
              {t('commandCenter.posture.title')}
            </h2>
            <p className="text-xs text-muted-foreground">{t('commandCenter.posture.subtitle')}</p>

            {isLoading ? (
              <div className="mt-4 space-y-3">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border px-3.5 py-3">
                  <span className="text-sm text-muted-foreground">
                    {t('commandCenter.posture.findings')}
                  </span>
                  <span className="font-display text-xl font-semibold tabular-nums">
                    {posture.findings}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border px-3.5 py-3">
                  <span className="text-sm text-muted-foreground">
                    {t('commandCenter.posture.risks')}
                  </span>
                  <span className="font-display text-xl font-semibold tabular-nums">
                    {posture.risks}
                  </span>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/risk-register">
                    <BookText className="mr-1.5 h-3.5 w-3.5" />
                    {t('commandCenter.quick.register')}
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Your always-on agents ──────────────────────────────────────────────────────── */}
      <section>
        <div className="mb-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            {t('commandCenter.agents.title')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('commandCenter.agents.subtitle')}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AGENTS.map((a) => {
            const Icon = a.icon;
            return (
              <Link key={a.key} href={a.href} className="group">
                <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-lg bg-muted',
                          a.accent
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-success">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                        </span>
                        {t('commandCenter.agents.live')}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium tracking-tight text-foreground">
                        {t(`commandCenter.agents.${a.key}.name`)}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t(`commandCenter.agents.${a.key}.desc`)}
                      </p>
                    </div>
                    <span className="inline-flex items-center font-mono text-[11px] text-muted-foreground/70 transition-colors group-hover:text-primary">
                      {t('commandCenter.agents.open')}
                      <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Quick actions ──────────────────────────────────────────────────────────────── */}
      <section className="flex flex-wrap gap-2.5">
        <Button asChild>
          <Link href="/assessments/new">
            <Plus className="mr-1.5 h-4 w-4" />
            {t('commandCenter.quick.newAssessment')}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/workspaces">
            <Building2 className="mr-1.5 h-4 w-4" />
            {t('commandCenter.quick.vendors')}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/chat">
            <MessageSquare className="mr-1.5 h-4 w-4" />
            {t('commandCenter.quick.askAi')}
          </Link>
        </Button>
      </section>
    </div>
  );
}
