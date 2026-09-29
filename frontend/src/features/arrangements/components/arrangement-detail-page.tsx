'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Play, Plus, FileText, ShieldCheck, ShieldAlert, Gauge, Check, X, ChevronRight, AlertTriangle, Send, Copy, Ban } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/lib/api/client';
import { arrangementsApi } from '@/features/arrangements/api/arrangements';
import {
  useArrangementQuery,
  useArrangementLifecycleQuery,
  useArrangementEvidenceQuery,
  useEvidenceChecklistQuery,
  useEvidenceRequestsQuery,
  useFindingsQuery,
  useRisksQuery,
} from '@/features/arrangements/queries/use-arrangements-query';
import {
  EVIDENCE_CATEGORY_LABELS,
  type RiskStatus,
  type EvidenceCategory,
} from '@/features/arrangements/api/arrangements';
import {
  CriticalityBadge,
  ArrangementTypeBadge,
  VerdictBadge,
  LifecycleBadge,
  RiskSeverityBadge,
  RiskStatusBadge,
} from './badges';

// Human labels for the state-machine transitions (the backend returns transition names).
const TRANSITION_LABEL: Record<string, string> = {
  start_due_diligence: 'Start due diligence',
  approve_onboarding: 'Approve onboarding',
  reject: 'Reject',
  start_review: 'Start review',
  flag_remediation: 'Flag remediation',
  resolve: 'Resolve',
  start_exit: 'Start exit',
  complete_exit: 'Complete exit',
};

// RTV-43 — the risk remediation state machine (mirrors the backend riskLifecycle.ts) + button labels.
const RISK_TRANSITIONS: Record<RiskStatus, RiskStatus[]> = {
  open: ['mitigating', 'accepted', 'closed'],
  mitigating: ['mitigated', 'accepted', 'closed', 'open'],
  mitigated: ['closed', 'accepted', 'mitigating'],
  accepted: ['closed', 'open'],
  closed: ['open'],
};
const RISK_ACTION_LABEL: Record<RiskStatus, string> = {
  open: 'Reopen',
  mitigating: 'Start mitigating',
  mitigated: 'Mark mitigated',
  accepted: 'Accept risk',
  closed: 'Close',
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium mt-0.5">{value ?? '—'}</div>
    </div>
  );
}

export function ArrangementDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [evOpen, setEvOpen] = useState(false);
  const [doc, setDoc] = useState('');
  const [src, setSrc] = useState('');
  const [cat, setCat] = useState<EvidenceCategory | ''>('');
  const [expiry, setExpiry] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // RTV-227/#227 — the "request from vendor" dialog + the freshly-minted shareable link.
  const [reqOpen, setReqOpen] = useState(false);
  const [reqEmail, setReqEmail] = useState('');
  const [reqMessage, setReqMessage] = useState('');
  const [reqLink, setReqLink] = useState<string | null>(null);

  const assess = useMutation({
    mutationFn: () => arrangementsApi.runAssessment(id),
    onSuccess: () => {
      toast.success('Assessment queued — findings will appear shortly');
      qc.invalidateQueries({ queryKey: ['findings', id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const { data: arrangement, isLoading } = useArrangementQuery(id);
  const { data: lifecycle } = useArrangementLifecycleQuery(id);
  const { data: evidence = [] } = useArrangementEvidenceQuery(id);
  const { data: checklist } = useEvidenceChecklistQuery(id); // RTV-64/#226

  const transition = useMutation({
    mutationFn: (t: string) => arrangementsApi.setLifecycle(id, t),
    onSuccess: (_res, t) => {
      toast.success(`${TRANSITION_LABEL[t] ?? t} — done`);
      qc.invalidateQueries({ queryKey: ['arrangement-lifecycle', id] });
      qc.invalidateQueries({ queryKey: ['arrangement', id] });
      qc.invalidateQueries({ queryKey: ['arrangements'] });
    },
    onError: (e) => {
      const msg = getErrorMessage(e);
      toast.error(
        msg.includes('checker') || msg.includes('management-body')
          ? 'A checker role is required for this decision'
          : msg
      );
    },
  });
  // Poll findings after a run is triggered; useFindingsQuery stops once findings appear.
  const assessing = assess.isSuccess;
  const findingsQuery = useFindingsQuery(id, assessing);
  const findings = findingsQuery.data?.findings ?? [];
  const coverage = findingsQuery.data?.coverage ?? null;
  // RTV-43 — the remediation loop: gaps a checker approved into tracked Risks.
  const { data: risks = [] } = useRisksQuery(id);

  const attach = useMutation({
    mutationFn: () =>
      arrangementsApi.attachEvidence(id, {
        document: doc.trim(),
        source: src.trim(),
        category: cat || undefined,
        validityUntil: expiry || undefined,
      }),
    onSuccess: () => {
      toast.success('Evidence attached');
      setDoc('');
      setSrc('');
      setCat('');
      setExpiry('');
      setEvOpen(false);
      qc.invalidateQueries({ queryKey: ['arrangement-evidence', id] });
      qc.invalidateQueries({ queryKey: ['evidence-checklist', id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // RTV-227/#227 — evidence collection requests (the vendor-portal institution side).
  const { data: evidenceRequests = [] } = useEvidenceRequestsQuery(id);
  const createRequest = useMutation({
    mutationFn: () =>
      arrangementsApi.createEvidenceRequest(id, {
        vendorEmail: reqEmail.trim(),
        message: reqMessage.trim() || undefined,
        // categories default server-side to the checklist's missingFromVendor.
      }),
    onSuccess: (res) => {
      const token = res.data?.request?.token;
      setReqLink(token ? `${window.location.origin}/v/evidence/${token}` : null);
      setReqEmail('');
      setReqMessage('');
      qc.invalidateQueries({ queryKey: ['evidence-requests', id] });
      toast.success('Evidence request created — share the link with the vendor');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const revokeRequest = useMutation({
    mutationFn: (requestId: string) => arrangementsApi.revokeEvidenceRequest(id, requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evidence-requests', id] });
      toast.success('Request revoked');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const ingest = useMutation({
    mutationFn: (f: File) => arrangementsApi.ingestEvidence(id, f),
    onSuccess: () => {
      toast.success('Document ingested — the next assessment can cite it');
      setEvOpen(false);
      qc.invalidateQueries({ queryKey: ['arrangement-evidence', id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const decide = useMutation({
    mutationFn: (v: { findingId: string; decision: 'approve' | 'reject' | 'reset' }) =>
      arrangementsApi.decideFinding(id, v.findingId, v.decision),
    onSuccess: (res) => {
      // approving a gap verdict opens a Risk (RTV-43) → surface it + refresh the remediation loop.
      toast.success(res.data?.risk ? 'Approved — a risk was opened in the remediation loop' : 'Decision recorded');
      qc.invalidateQueries({ queryKey: ['findings', id] });
      qc.invalidateQueries({ queryKey: ['risks', id] });
    },
    onError: (e) => {
      const msg = getErrorMessage(e);
      toast.error(msg.includes('permission') ? 'A checker role is required to decide findings' : msg);
    },
  });

  // RTV-43 — advance a risk through the remediation lifecycle. `accepted` needs a rationale (the
  // management-body sign-off, risk:accept); the progress transitions need risk:manage.
  const [acceptFor, setAcceptFor] = useState<string | null>(null);
  const [acceptReason, setAcceptReason] = useState('');
  const changeRisk = useMutation({
    mutationFn: (v: { riskId: string; status: RiskStatus; reason?: string }) =>
      arrangementsApi.updateRisk(id, v.riskId, v.status, v.reason),
    onSuccess: (_res, v) => {
      toast.success(v.status === 'accepted' ? 'Risk accepted' : `Risk moved to ${v.status}`);
      qc.invalidateQueries({ queryKey: ['risks', id] });
      setAcceptFor(null);
      setAcceptReason('');
    },
    onError: (e) => {
      const msg = getErrorMessage(e);
      toast.error(
        msg.includes('permission') ? 'You do not have permission for this risk action' : msg
      );
    },
  });

  if (isLoading) return <div className="page-container max-w-5xl mx-auto space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  if (!arrangement) return <div className="page-container max-w-5xl mx-auto">Arrangement not found.</div>;

  return (
    <div className="page-container max-w-5xl mx-auto">
      <button onClick={() => router.push('/arrangements')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Arrangements
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{arrangement.providerName} · {arrangement.businessFunctionName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{arrangement.legalEntityName}</p>
        </div>
        <Button
          size="sm"
          onClick={() => assess.mutate()}
          disabled={assess.isPending || (assessing && findings.length === 0)}
        >
          <Play className="h-4 w-4 mr-2" />
          {assessing && findings.length === 0 ? 'Assessing…' : 'Run assessment'}
        </Button>
      </div>

      {/* Lifecycle (RTV-31) — current state + the valid next transitions (approval moves = primary) */}
      {lifecycle && (
        <div className="rounded-lg border p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Lifecycle</span>
            <LifecycleBadge value={lifecycle.status} />
          </div>
          {lifecycle.transitions.length > 0 ? (
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              {lifecycle.transitions.map((t) => (
                <Button
                  key={t.transition}
                  size="sm"
                  variant={t.approval ? 'default' : 'outline'}
                  disabled={transition.isPending}
                  onClick={() => transition.mutate(t.transition)}
                  title={t.approval ? 'Management-body decision — requires a checker role' : undefined}
                >
                  {t.approval && <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />}
                  {TRANSITION_LABEL[t.transition] ?? t.transition}
                </Button>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground sm:ml-auto">Terminal state — no further transitions.</span>
          )}
        </div>
      )}

      {/* Dimensions */}
      <div className="rounded-lg border p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label="Type" value={<ArrangementTypeBadge value={arrangement.arrangementType} />} />
        <Field label="Criticality" value={<CriticalityBadge value={arrangement.criticality} />} />
        <Field label="ICT service" value={arrangement.ictServiceName} />
        <Field label="Data residency" value={arrangement.dataResidency || '—'} />
        <Field label="Dependency" value={arrangement.dependency ?? '—'} />
        <Field label="Exit difficulty" value={arrangement.exitDifficulty ?? '—'} />
        <Field label="Data classes" value={arrangement.dataClasses?.length ? arrangement.dataClasses.join(', ') : '—'} />
        <Field label="CIF" value={arrangement.criticalOrImportant ? <Badge variant="destructive" className="text-xs">Yes</Badge> : 'No'} />
      </div>

      {/* Evidence */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold flex items-center gap-1.5"><FileText className="h-4 w-4" /> Evidence ({evidence.length})</h2>
          <Button size="sm" variant="outline" onClick={() => setEvOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Attach</Button>
        </div>
        {/* DORA evidence checklist (RTV-64/#226) — expected vs present; missing = a tracked gap. */}
        {checklist && checklist.items.length > 0 && (
          <div className="rounded-lg border p-3 mb-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">DORA evidence checklist</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {checklist.summary.present}/{checklist.summary.expected} present · {Math.round(checklist.summary.coverage * 100)}%
              </span>
            </div>
            <div className="divide-y">
              {checklist.items.map((it) => (
                <div key={it.category} className="flex items-center justify-between py-1.5 text-sm">
                  <span>
                    {it.label}{' '}
                    <span className="text-[10px] text-muted-foreground">({it.expectedSource})</span>
                  </span>
                  {it.status === 'present' ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-[10px]">present</Badge>
                  ) : it.status === 'expired' ? (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-[10px]">expired</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">missing{it.blockedOn ? ` · ${it.blockedOn}` : ''}</Badge>
                  )}
                </div>
              ))}
            </div>
            {checklist.summary.missing > 0 && (
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  {checklist.summary.missing} expected item(s) missing — tracked as gaps (DORA keeps the firm accountable).
                  {checklist.summary.missingFromVendor.length > 0 && ` ${checklist.summary.missingFromVendor.length} to request from the vendor.`}
                </p>
                {checklist.summary.missingFromVendor.length > 0 && (
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => { setReqLink(null); setReqOpen(true); }}>
                    <Send className="h-3.5 w-3.5 mr-1" /> Request from vendor
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
        {/* RTV-227/#227 — outstanding evidence requests raised to vendors. */}
        {evidenceRequests.length > 0 && (
          <div className="rounded-lg border p-3 mb-3 space-y-1.5">
            <span className="text-xs font-semibold">Vendor evidence requests</span>
            <div className="divide-y">
              {evidenceRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-1.5 text-sm gap-2">
                  <span className="truncate">
                    {r.vendorEmail}{' '}
                    <span className="text-[10px] text-muted-foreground">({r.requestedCategories.length} categor{r.requestedCategories.length === 1 ? 'y' : 'ies'})</span>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {r.status === 'pending' ? (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-[10px]">pending</Badge>
                    ) : r.status === 'fulfilled' ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-[10px]">submitted</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">revoked</Badge>
                    )}
                    {r.status === 'pending' && r.token && (
                      <Button size="icon" variant="ghost" className="h-6 w-6" title="Copy vendor link"
                        onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/v/evidence/${r.token}`); toast.success('Link copied'); }}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {r.status === 'pending' && (
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" title="Revoke"
                        onClick={() => revokeRequest.mutate(r.id)} disabled={revokeRequest.isPending}>
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {evidence.length === 0 ? (
          <p className="text-sm text-muted-foreground">No evidence attached. Without evidence, every control is <em>insufficient evidence</em> (human review) — never a false pass.</p>
        ) : (
          <div className="rounded-md border divide-y">
            {evidence.map((e) => (
              <div key={e.id} className="px-3 py-2 text-sm flex items-center justify-between">
                <span className="font-medium">{e.document}</span>
                <span className="text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px] mr-2">{e.scope === 'provider' ? 'provider-global' : 'arrangement'}</Badge>
                  {e.source || '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Coverage (RTV-42) — "control/evidence coverage", never "% compliant" */}
      {coverage && findings.length > 0 && (
        <div className="rounded-lg border p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold flex items-center gap-1.5"><Gauge className="h-4 w-4" /> Control/evidence coverage</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {coverage.controlsWithSufficientEvidence}/{coverage.applicableControls} controls assessed on evidence
            </span>
          </div>
          <Progress value={Math.round(coverage.coverage * 100)} />
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span><span className="font-medium text-foreground tabular-nums">{Math.round(coverage.coverage * 100)}%</span> coverage</span>
            <span>Confidence <span className="font-medium text-foreground tabular-nums">{Math.round(coverage.confidence * 100)}%</span> (evidence-derived)</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Coverage = controls with sufficient evidence ÷ applicable controls. This is <strong>not</strong> a
            &ldquo;% compliant&rdquo; score — missing evidence lowers coverage, it never becomes a false pass.
          </p>
        </div>
      )}

      {/* Findings */}
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-1.5 mb-2"><ShieldCheck className="h-4 w-4" /> Findings ({findings.length})</h2>
        {findings.some((f) => f.stale) && (
          <div className="mb-2 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-sm text-amber-700 dark:text-amber-500">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {findings.filter((f) => f.stale).length} finding(s) are out of date — evidence changed since the last assessment.
            </span>
            <Button size="sm" variant="outline" className="ml-auto h-7" onClick={() => assess.mutate()} disabled={assess.isPending || (assessing && findings.length === 0)}>
              Re-assess
            </Button>
          </div>
        )}
        {findings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No findings yet — run an assessment to generate evidence-grounded, cited verdicts.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-6"></TableHead>
                  <TableHead>Control</TableHead>
                  <TableHead>Verdict</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {findings.map((f) => (
                  <Fragment key={f.id}>
                    <TableRow className="cursor-pointer" onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}>
                      <TableCell>
                        <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expandedId === f.id ? 'rotate-90' : ''}`} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{f.controlId}</TableCell>
                      <TableCell><VerdictBadge verdict={f.verdict} /></TableCell>
                      <TableCell className="text-xs tabular-nums">{f.confidence != null ? `${Math.round(f.confidence * 100)}%` : '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={f.status === 'approved' ? 'default' : f.status === 'rejected' ? 'destructive' : 'outline'}
                            className={`text-[10px] ${f.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100' : ''}`}
                          >
                            {f.status}
                          </Badge>
                          {f.stale && (
                            <span className="flex items-center gap-0.5 text-[10px] text-amber-600" title="Evidence changed since this was assessed">
                              <AlertTriangle className="h-3 w-3" /> out of date
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {f.status === 'draft' ? (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600" disabled={decide.isPending} onClick={() => decide.mutate({ findingId: f.id, decision: 'approve' })}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" disabled={decide.isPending} onClick={() => decide.mutate({ findingId: f.id, decision: 'reject' })}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" disabled={decide.isPending} onClick={() => decide.mutate({ findingId: f.id, decision: 'reset' })}>
                            reopen
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedId === f.id && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell />
                        <TableCell colSpan={5} className="text-xs space-y-2 py-3">
                          <p className="text-muted-foreground">{f.rationale || 'No rationale recorded.'}</p>
                          {f.citations?.length > 0 ? (
                            <div className="space-y-1">
                              <p className="font-medium">Cited evidence:</p>
                              {f.citations.map((c, i) => (
                                <div key={i} className="rounded bg-background border px-2 py-1">
                                  <span className="text-muted-foreground">{c.source}</span> — {c.snippet}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground italic">No evidence cited — control library {f.libraryVersion}.</p>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Risks · remediation loop (RTV-43) — gaps a checker approved into tracked, owned risks */}
      {risks.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
            <ShieldAlert className="h-4 w-4" /> Risks · remediation loop ({risks.length})
          </h2>
          <div className="rounded-md border divide-y">
            {risks.map((r) => {
              const nexts = RISK_TRANSITIONS[r.status] ?? [];
              return (
                <div key={r.id} className="px-3 py-2.5 text-sm space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs">{r.controlId}</span>
                    <RiskSeverityBadge value={r.severity} />
                    <RiskStatusBadge value={r.status} />
                  </div>
                  {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                  {nexts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {nexts.map((s) =>
                        s === 'accepted' ? (
                          <Button
                            key={s}
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={changeRisk.isPending}
                            onClick={() => setAcceptFor(r.id)}
                            title="Management-body sign-off — requires a checker role"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Accept risk
                          </Button>
                        ) : (
                          <Button
                            key={s}
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            disabled={changeRisk.isPending}
                            onClick={() => changeRisk.mutate({ riskId: r.id, status: s })}
                          >
                            {RISK_ACTION_LABEL[s]}
                          </Button>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={evOpen} onOpenChange={setEvOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Attach evidence</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-dashed p-3">
              <Label className="text-xs text-muted-foreground">Upload a document (indexed so verdicts cite real text)</Label>
              <input
                type="file"
                accept=".pdf,.docx,.xlsx"
                disabled={ingest.isPending}
                className="mt-1.5 block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-primary-foreground"
                onChange={(e) => e.target.files?.[0] && ingest.mutate(e.target.files[0])}
              />
              {ingest.isPending && <p className="text-xs text-muted-foreground mt-1">Indexing…</p>}
            </div>
            <p className="text-xs text-center text-muted-foreground">— or record metadata only —</p>
            <div className="space-y-1.5">
              <Label>Document *</Label>
              <Input placeholder="e.g. ISO 27001 certificate" value={doc} onChange={(e) => setDoc(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Input placeholder="e.g. Provider Trust Center" value={src} onChange={(e) => setSrc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>DORA category</Label>
                <select
                  value={cat}
                  onChange={(e) => setCat(e.target.value as EvidenceCategory | '')}
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">— uncategorised —</option>
                  {(Object.keys(EVIDENCE_CATEGORY_LABELS) as EvidenceCategory[]).map((c) => (
                    <option key={c} value={c}>{EVIDENCE_CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Valid until</Label>
                <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Set a DORA category so it counts on the checklist; a validity date flags expiry.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvOpen(false)}>Cancel</Button>
            <Button disabled={!doc.trim() || attach.isPending} onClick={() => attach.mutate()}>Attach</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request-from-vendor dialog (RTV-227/#227) — asks the vendor for the missing categories. */}
      <Dialog open={reqOpen} onOpenChange={(o) => { setReqOpen(o); if (!o) setReqLink(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Request evidence from the vendor</DialogTitle></DialogHeader>
          {reqLink ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Share this secure link with the vendor. It lets them upload only the requested
                documents — no Retrieva account needed.
              </p>
              <div className="flex items-center gap-2">
                <Input readOnly value={reqLink} className="text-xs" onFocus={(e) => e.target.select()} />
                <Button size="icon" variant="outline" className="shrink-0" title="Copy"
                  onClick={() => { navigator.clipboard.writeText(reqLink); toast.success('Link copied'); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => { setReqOpen(false); setReqLink(null); }}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] text-muted-foreground">
                We&apos;ll ask the vendor for the {checklist?.summary.missingFromVendor.length ?? 0} categor
                {(checklist?.summary.missingFromVendor.length ?? 0) === 1 ? 'y' : 'ies'} currently missing from them.
              </p>
              <div className="space-y-1.5">
                <Label>Vendor email *</Label>
                <Input type="email" placeholder="contact@vendor.com" value={reqEmail} onChange={(e) => setReqEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Message (optional)</Label>
                <Textarea rows={3} placeholder="A short note shown to the vendor…" value={reqMessage} onChange={(e) => setReqMessage(e.target.value)} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReqOpen(false)}>Cancel</Button>
                <Button disabled={!reqEmail.trim() || createRequest.isPending} onClick={() => createRequest.mutate()}>
                  {createRequest.isPending ? 'Creating…' : 'Create request'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Accept-risk dialog (RTV-43) — the management-body sign-off; a rationale is mandatory. */}
      <Dialog
        open={!!acceptFor}
        onOpenChange={(o) => {
          if (!o) {
            setAcceptFor(null);
            setAcceptReason('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Accept risk</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Accepting a risk is the management-body sign-off (requires a checker role). The rationale
              is recorded in the immutable audit trail.
            </p>
            <Textarea
              rows={4}
              placeholder="Rationale for accepting the residual risk…"
              value={acceptReason}
              onChange={(e) => setAcceptReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAcceptFor(null);
                setAcceptReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!acceptReason.trim() || changeRisk.isPending}
              onClick={() =>
                acceptFor &&
                changeRisk.mutate({ riskId: acceptFor, status: 'accepted', reason: acceptReason.trim() })
              }
            >
              Accept risk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
