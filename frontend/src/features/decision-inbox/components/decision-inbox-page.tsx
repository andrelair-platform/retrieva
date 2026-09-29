'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Inbox, Check, X, SkipForward, ShieldCheck, Sparkles, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { getErrorMessage } from '@/lib/api/client';
import { VerdictBadge, RiskSeverityBadge } from '@/features/arrangements/components/badges';
import { isVerdictOverride, type DecisionItem } from '@/features/decision-inbox/api/decision-inbox';
import {
  useDecisionQueueQuery,
  useDecideFindingMutation,
  useUpdateRiskMutation,
  useAcceptHighConfidenceMutation,
} from '@/features/decision-inbox/queries/use-decision-inbox';

const HIGH_CONFIDENCE = 0.8;

function ConfidenceBar({ value }: { value: number | null | undefined }) {
  const pct = Math.round((value ?? 0) * 100);
  const tone = value == null ? 'bg-muted' : pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {value == null ? 'n/a' : `${pct}%`}
      </span>
    </div>
  );
}

export function DecisionInboxPage() {
  const { data, isLoading } = useDecisionQueueQuery();
  const decideFinding = useDecideFindingMutation();
  const updateRisk = useUpdateRiskMutation();
  const acceptHigh = useAcceptHighConfidenceMutation();

  const [selected, setSelected] = useState(0);
  const [deferred, setDeferred] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('');
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  // Deferring hides an item for this session (no server state); the queue stays urgency-sorted.
  const items = useMemo(
    () => (data?.items ?? []).filter((i) => !deferred.has(`${i.kind}:${i.id}`)),
    [data, deferred]
  );
  // Derive the clamped selection (items shrink as decisions/defers remove them) — no effect needed.
  const sel = items.length ? Math.min(selected, items.length - 1) : 0;
  const current = items[sel];

  // Selecting a different item resets the reason field (done at the interaction, not in an effect).
  const select = useCallback((i: number) => {
    setSelected(i);
    setReason('');
  }, []);

  const busy = decideFinding.isPending || updateRisk.isPending;

  const defer = useCallback(
    (item: DecisionItem) => {
      setDeferred((d) => new Set(d).add(`${item.kind}:${item.id}`));
      setReason('');
    },
    []
  );

  const runFinding = useCallback(
    async (item: DecisionItem, decision: 'approve' | 'reject') => {
      const override = item.verdict ? isVerdictOverride(item.verdict, decision) : false;
      if (override && !reason.trim()) {
        toast.warning('A reason is required to go against the AI verdict.');
        reasonRef.current?.focus();
        return;
      }
      try {
        const res = await decideFinding.mutateAsync({
          arrangementId: item.arrangementId,
          findingId: item.id,
          decision,
          reason: override ? reason.trim() : undefined,
        });
        toast.success(
          decision === 'approve' ? 'Finding approved' : 'Finding overridden',
          res.data?.risk ? { description: 'A remediation risk was opened.' } : undefined
        );
        setReason('');
      } catch (e) {
        toast.error(getErrorMessage(e));
      }
    },
    [decideFinding, reason]
  );

  const runRisk = useCallback(
    async (item: DecisionItem, status: 'mitigating' | 'accepted') => {
      if (status === 'accepted' && !reason.trim()) {
        toast.warning('Accepting a risk requires a rationale (management-body sign-off).');
        reasonRef.current?.focus();
        return;
      }
      try {
        await updateRisk.mutateAsync({
          arrangementId: item.arrangementId,
          riskId: item.id,
          status,
          reason: status === 'accepted' ? reason.trim() : undefined,
        });
        toast.success(status === 'accepted' ? 'Risk accepted' : 'Risk moved to mitigating');
        setReason('');
      } catch (e) {
        toast.error(getErrorMessage(e));
      }
    },
    [updateRisk, reason]
  );

  // Keyboard: j/↓ next · k/↑ prev · a primary-accept · r reject/override · d defer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) return; // don't hijack typing
      if (!current) return;
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        select(Math.min(sel + 1, items.length - 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        select(Math.max(sel - 1, 0));
      } else if (e.key === 'd') {
        e.preventDefault();
        defer(current);
      } else if (e.key === 'a') {
        e.preventDefault();
        if (current.kind === 'finding') runFinding(current, 'approve');
        else runRisk(current, 'mitigating');
      } else if (e.key === 'r') {
        e.preventDefault();
        if (current.kind === 'finding') runFinding(current, 'reject');
        else runRisk(current, 'accepted');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, items.length, sel, select, defer, runFinding, runRisk]);

  const onAcceptHigh = async () => {
    try {
      const res = await acceptHigh.mutateAsync(HIGH_CONFIDENCE);
      const r = res.data;
      toast.success(`Accepted ${r?.approved ?? 0} high-confidence findings`, {
        description:
          `${r?.requiresIndividualReason ?? 0} gap(s) still need an individual reasoned decision` +
          (r?.skipped?.length ? `; ${r.skipped.length} skipped (you authored them).` : '.'),
      });
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Inbox className="h-6 w-6" /> Decision Inbox
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Everything the AI concluded that awaits your decision — least-confident first. The AI
            drafts; you decide.
          </p>
        </div>
        <Button onClick={onAcceptHigh} disabled={acceptHigh.isPending || !items.length} variant="outline">
          <Sparkles className="h-4 w-4 mr-1.5" />
          Accept all high-confidence
        </Button>
      </div>

      {data && (
        <div className="flex gap-2 text-xs">
          <Badge variant="outline">{data.counts.total} awaiting</Badge>
          <Badge variant="outline">{data.counts.findings} findings</Badge>
          <Badge variant="outline">{data.counts.risks} risks</Badge>
          <span className="text-muted-foreground ml-2 self-center">
            keys: <kbd>j</kbd>/<kbd>k</kbd> move · <kbd>a</kbd> accept · <kbd>r</kbd> override · <kbd>d</kbd> defer
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : !items.length ? (
        <Card className="p-10 text-center text-muted-foreground">
          <Check className="h-8 w-8 mx-auto mb-2 text-green-600" />
          Nothing awaiting a decision. Inbox zero.
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => {
            const isSel = i === sel;
            return (
              <Card
                key={`${item.kind}:${item.id}`}
                onClick={() => select(i)}
                className={`p-4 cursor-pointer transition-colors ${isSel ? 'ring-2 ring-primary' : 'hover:bg-muted/40'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-xs shrink-0">
                      {item.kind === 'finding' ? <FileText className="h-3 w-3 mr-1" /> : <ShieldCheck className="h-3 w-3 mr-1" />}
                      {item.kind}
                    </Badge>
                    <span className="font-medium truncate">{item.providerName}</span>
                    {item.businessFunctionName && (
                      <span className="text-muted-foreground text-sm truncate">· {item.businessFunctionName}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.kind === 'finding' && item.verdict && <VerdictBadge verdict={item.verdict} />}
                    {item.kind === 'risk' && item.severity && <RiskSeverityBadge value={item.severity} />}
                  </div>
                </div>

                <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <code className="text-[11px]">{item.controlId}</code>
                  {item.kind === 'finding' && <ConfidenceBar value={item.confidence} />}
                </div>

                {isSel && (
                  <div className="mt-3 space-y-3 border-t pt-3">
                    {item.kind === 'finding' ? (
                      <>
                        <p className="text-sm">{item.rationale || <span className="text-muted-foreground">No rationale.</span>}</p>
                        {!!item.citations?.length && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Cited evidence</p>
                            {item.citations.slice(0, 4).map((c, k) => (
                              <div key={k} className="text-xs bg-muted/50 rounded p-2">
                                <span className="font-medium">{c.source}</span>: {c.snippet}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium">{item.title}</p>
                        {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                      </>
                    )}

                    <Textarea
                      ref={reasonRef}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason (required to override the AI verdict / accept a risk)"
                      className="text-sm"
                      rows={2}
                    />

                    <div className="flex flex-wrap gap-2">
                      {item.kind === 'finding' ? (
                        <>
                          <Button size="sm" disabled={busy} onClick={() => runFinding(item, 'approve')}>
                            <Check className="h-4 w-4 mr-1" /> Accept AI verdict <kbd className="ml-1.5 opacity-60">a</kbd>
                          </Button>
                          <Button size="sm" variant="destructive" disabled={busy} onClick={() => runFinding(item, 'reject')}>
                            <X className="h-4 w-4 mr-1" /> Override <kbd className="ml-1.5 opacity-60">r</kbd>
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" disabled={busy} onClick={() => runRisk(item, 'mitigating')}>
                            Start mitigating <kbd className="ml-1.5 opacity-60">a</kbd>
                          </Button>
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => runRisk(item, 'accepted')}>
                            Accept risk <kbd className="ml-1.5 opacity-60">r</kbd>
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => defer(item)}>
                        <SkipForward className="h-4 w-4 mr-1" /> Defer <kbd className="ml-1.5 opacity-60">d</kbd>
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
