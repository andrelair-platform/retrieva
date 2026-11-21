'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  ClipboardCheck,
  Scale,
  UploadCloud,
  Layers,
  CheckCircle2,
  XCircle,
  CircleDashed,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getErrorMessage } from '@/shared/api/client';
import {
  useOnboardingDecisionQuery,
  useClausePackQuery,
  useClauseGapCheck,
} from '@/features/arrangements/queries/use-onboarding';
import type {
  ClauseGapReport,
  ClauseCoverage,
  Readiness,
  ReadinessStatus,
  Intake,
} from '@/features/arrangements/api/onboarding';

// Pre-contract readiness checklist labels (keyed by the backend ReadinessItem.key).
const READINESS_LABEL: Record<string, string> = {
  intake: 'Intake confirmed',
  assessment: 'Assessment run',
  findings: 'No blocking findings',
  evidence: 'Evidence sufficient',
};
const STATUS_ICON: Record<ReadinessStatus, typeof CheckCircle2> = {
  pass: CheckCircle2,
  fail: XCircle,
  pending: CircleDashed,
};
const STATUS_COLOR: Record<ReadinessStatus, string> = {
  pass: 'text-green-600',
  fail: 'text-red-600',
  pending: 'text-amber-600',
};

function money(intake?: Intake): string | null {
  if (!intake?.expectedCost) return null;
  const n = Number(intake.expectedCost);
  if (Number.isNaN(n)) return null;
  const cur = intake.expectedCostCurrency || 'EUR';
  return `${cur} ${n.toLocaleString()}`;
}

const REC_STYLE: Record<string, string> = {
  ready: 'bg-green-100 text-green-700 border-green-200',
  review: 'bg-amber-100 text-amber-700 border-amber-200',
  blocked: 'bg-red-100 text-red-700 border-red-200',
};
const COVERAGE_STYLE: Record<ClauseCoverage, string> = {
  covered: 'bg-green-100 text-green-700',
  weak: 'bg-amber-100 text-amber-700',
  missing: 'bg-red-100 text-red-700',
};

// The pre-contract onboarding surface (ADR-0002): decision pack + the DORA Art. 30 clause pack with a
// draft-contract gap-check. Shown for arrangements still being onboarded (prospect / due_diligence).
const PRE_CONTRACT = new Set(['prospect', 'due_diligence']);

function isPreContract(lifecycleStatus?: string): boolean {
  return !lifecycleStatus || PRE_CONTRACT.has(lifecycleStatus);
}

function buildCoverageMap(report: ClauseGapReport | null): Map<string, ClauseGapReport['items'][number]> {
  return new Map((report?.items ?? []).map((i) => [i.controlId, i]));
}

type MetricTone = 'ok' | 'warn' | 'bad' | 'default';

const badTone = (n: number): MetricTone => (n ? 'bad' : 'ok');
const warnTone = (n: number): MetricTone => (n ? 'warn' : 'ok');

const gateDecisionLabel = (canApprove: boolean): string =>
  canApprove ? 'approve / reject onboarding' : 'onboarding';

const gapCheckLabel = (isPending: boolean): string => (isPending ? 'Checking…' : 'Gap-check a draft');

// eslint-disable-next-line complexity -- irreducible render-branch floor: ~10 single-flag JSX conditionals, each gating a distinct subtree (readiness/decision/reasons/concentration/pack/report); non-JSX logic already hoisted to module helpers (isPreContract/buildCoverageMap/badTone/warnTone/gateDecisionLabel/gapCheckLabel); extracting subtrees would create sub-components. tracked minicloud-gitops#2353
export function OnboardingPanel({ id, lifecycleStatus }: { id: string; lifecycleStatus?: string }) {
  const show = isPreContract(lifecycleStatus);
  const { data: decision } = useOnboardingDecisionQuery(id, show);
  const { data: pack } = useClausePackQuery(id);
  const gapCheck = useClauseGapCheck(id);
  const [report, setReport] = useState<ClauseGapReport | null>(null);

  if (!show) return null;

  const onDraft = (file: File | null) => {
    if (!file) return;
    gapCheck.mutate(file, {
      onSuccess: (res) => {
        setReport(res.data ?? null);
        toast.success('Draft contract checked against the required clauses');
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  const coverageById = buildCoverageMap(report);

  return (
    <div className="space-y-4">
      {/* ── pre-contract readiness checklist (the HARD gate, made legible) ──────── */}
      {decision?.readiness && <ReadinessCard readiness={decision.readiness} intake={decision.intake} />}

      {/* ── onboarding decision pack ─────────────────────────────────────────── */}
      {decision && (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <ClipboardCheck className="h-4 w-4" /> Onboarding decision
            </h2>
            <Badge variant="outline" className={`text-[11px] capitalize ${REC_STYLE[decision.recommendation]}`}>
              {decision.recommendation}
            </Badge>
          </div>
          {decision.reasons.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
              {decision.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Non-compliant" value={decision.assessment.blocking} tone={badTone(decision.assessment.blocking)} />
            <Metric label="Needs evidence" value={decision.assessment.needsEvidence} tone={warnTone(decision.assessment.needsEvidence)} />
            <Metric label="Controls assessed" value={decision.assessment.total} />
            <Metric label="Exit difficulty" value={decision.exit.difficulty} />
          </div>
          {/* concentration signal */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            {decision.concentration.entityTopProvider ? (
              <span className="text-muted-foreground">
                Top provider for this entity:{' '}
                <span className="text-foreground">{decision.concentration.entityTopProvider.name}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">No concentration mapped for this entity yet.</span>
            )}
            {decision.concentration.addsToSharedSubstrate && (
              <Badge variant="outline" className="bg-amber-50 text-[10px] text-amber-700">adds to a shared substrate</Badge>
            )}
            {decision.concentration.functionIsSpof && (
              <Badge variant="outline" className="bg-amber-50 text-[10px] text-amber-700">function is a single point of failure</Badge>
            )}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Advisory only — the {gateDecisionLabel(decision.gate.canApproveOnboarding)} decision
            is yours (use the lifecycle controls above).
          </p>
        </Card>
      )}

      {/* ── DORA Art. 30 contract clause pack + draft gap-check ───────────────── */}
      {pack && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <Scale className="h-4 w-4" /> Contract clauses — DORA Art. 30 ({pack.total})
            </h2>
            <div className="flex items-center gap-2">
              {pack.cif && <Badge variant="outline" className="text-[10px]">CIF — incl. Art. 30(3)</Badge>}
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-muted">
                <UploadCloud className="h-3.5 w-3.5" />
                {gapCheckLabel(gapCheck.isPending)}
                <input
                  type="file"
                  accept=".pdf,.docx,.xlsx"
                  className="sr-only"
                  disabled={gapCheck.isPending}
                  onChange={(e) => onDraft(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>

          {report && (
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
              <Badge variant="outline" className="bg-green-100 text-green-700">covered {report.summary.covered}</Badge>
              <Badge variant="outline" className="bg-amber-100 text-amber-700">weak {report.summary.weak}</Badge>
              <Badge variant="outline" className="bg-red-100 text-red-700">missing {report.summary.missing}</Badge>
              {report.source && <span className="text-muted-foreground">from {report.source.fileName}</span>}
            </div>
          )}

          <div className="mt-3 rounded-md border divide-y">
            {pack.clauses.map((c) => {
              const cov = coverageById.get(c.controlId);
              return (
                <div key={c.controlId} className="flex items-start justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{c.title}</span>
                      <span className="text-[10px] text-muted-foreground">{c.articleRef}</span>
                      {c.tier === 'cif' && <Badge variant="outline" className="text-[10px]">CIF</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{c.requirement}</p>
                  </div>
                  {cov && (
                    <Badge variant="outline" className={`shrink-0 text-[10px] capitalize ${COVERAGE_STYLE[cov.coverage]}`}>
                      {cov.coverage}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Required contractual provisions for the legal team, tiered by criticality. The gap-check is a
            deterministic pattern pass — review each clause; “weak” means present but thin.
          </p>
        </Card>
      )}
    </div>
  );
}

function blockerBadgeLabel(cleared: boolean, blockerCount: number): string {
  if (cleared) return 'Cleared to activate';
  const count = blockerCount || 'Not';
  const plural = blockerCount === 1 ? '' : 's';
  return `${count} blocker${plural}`;
}

// Type-guard so the JSX block below narrows `intake` to defined (it is, when true).
function showIntakeSummary(intake: Intake | undefined, cost: string | null): intake is Intake {
  return Boolean(intake && (intake.businessPurpose || cost || intake.requestedStartDate));
}

function clearedBadgeClass(cleared: boolean): string {
  return cleared
    ? 'bg-green-100 text-green-700 border-green-200'
    : 'bg-amber-100 text-amber-700 border-amber-200';
}

function ReadinessCard({ readiness, intake }: { readiness: Readiness; intake?: Intake }) {
  const cleared = readiness.canActivate;
  const cost = money(intake);
  const badgeClass = clearedBadgeClass(cleared);
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          {cleared ? (
            <ShieldCheck className="h-4 w-4 text-green-600" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          )}
          Pre-contract readiness
        </h2>
        <Badge variant="outline" className={`text-[11px] ${badgeClass}`}>
          {blockerBadgeLabel(cleared, readiness.blockers.length)}
        </Badge>
      </div>

      <ul className="mt-3 space-y-1.5">
        {readiness.items.map((item) => {
          const Icon = STATUS_ICON[item.status] ?? CircleDashed;
          return (
            <li key={item.key} className="flex items-start gap-2 text-xs">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${STATUS_COLOR[item.status] ?? 'text-muted-foreground'}`} />
              <span>
                <span className="font-medium text-foreground">{READINESS_LABEL[item.key] ?? item.key}</span>
                <span className="text-muted-foreground"> — {item.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {/* intake summary (Workflow B step 1) */}
      {showIntakeSummary(intake, cost) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-2 text-[11px] text-muted-foreground">
          {intake.businessPurpose && (
            <span>
              Purpose: <span className="text-foreground">{intake.businessPurpose}</span>
            </span>
          )}
          {cost && (
            <span>
              Expected cost: <span className="text-foreground">{cost}</span>
            </span>
          )}
          {intake.requestedStartDate && (
            <span>
              Requested start: <span className="text-foreground">{intake.requestedStartDate}</span>
            </span>
          )}
        </div>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">
        {cleared
          ? 'All pre-contract conditions met — a checker may approve onboarding (activation).'
          : 'Activation is blocked until these conditions are met. The checker can resolve the findings or formally accept the risk, then approve — the platform will not activate a risky supplier silently.'}
      </p>
    </Card>
  );
}

function Metric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'ok' | 'warn' | 'bad' | 'default';
}) {
  const toneCls =
    tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : tone === 'ok' ? 'text-green-600' : 'text-foreground';
  return (
    <div className="rounded-md border p-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold capitalize tabular-nums ${toneCls}`}>{value}</p>
    </div>
  );
}
