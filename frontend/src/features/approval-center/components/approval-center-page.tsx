'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { ShieldCheck, Check, X, RotateCcw, Inbox, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/api/client';
import {
  decisionNeedsJustification,
  type DecisionVerb,
  type RunApproval,
} from '@/features/approval-center/api/approvals';
import { useApprovalsQuery, useDecideApprovalMutation } from '@/features/approval-center/queries/use-approvals';
import { useRunUpdates } from '@/shared/realtime/use-run-updates';

const GATE_LABEL: Record<string, string> = {
  confirm_arrangement: 'Confirm the proposed arrangement',
  approve_findings: 'Approve the assessment findings',
  final_sign_off: 'Final sign-off',
};

function Evidence({ approval }: { approval: RunApproval }) {
  // Show the proposed action without the internal `type` discriminator.
  const rest = Object.fromEntries(
    Object.entries(approval.proposedAction ?? {}).filter(([k]) => k !== 'type')
  );
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{GATE_LABEL[approval.gate] ?? approval.gate}</p>
      <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
        {JSON.stringify(Object.keys(rest).length ? rest : approval.proposedAction, null, 2)}
      </pre>
      <p className="text-xs text-muted-foreground">
        Run <span className="font-mono">{approval.runId.slice(0, 8)}</span> · raised{' '}
        {new Date(approval.createdAt).toLocaleString()}
      </p>
    </div>
  );
}

export function ApprovalCenterPage() {
  useRunUpdates(); // live push (falls back to polling if the socket can't connect)
  const [mine, setMine] = useState(false);
  const { data: approvals, isLoading } = useApprovalsQuery(mine);
  const decide = useDecideApprovalMutation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const selected = useMemo(
    () => approvals?.find((a) => a.id === selectedId) ?? null,
    [approvals, selectedId]
  );

  const onDecide = async (decision: DecisionVerb) => {
    if (!selected) return;
    if (decisionNeedsJustification(decision) && !reason.trim()) {
      toast.error('A reason is required to reject or request changes.');
      return;
    }
    try {
      await decide.mutateAsync({
        id: selected.id,
        body: { decision, justification: reason.trim() || undefined, expectedRunVersion: Number(selected.runVersionAtRequest) },
      });
      toast.success(`Decision recorded: ${decision.replace('_', ' ')}.`);
      setReason('');
      setSelectedId(null);
    } catch (e) {
      // Concurrency / stale protection (RTV-85): the run moved on, or someone else already decided.
      const status = e instanceof AxiosError ? e.response?.status : undefined;
      if (status === 409) toast.error('This review is no longer current — it changed or was already decided. Refreshing.');
      else if (status === 403) toast.error('You are not authorised to decide this gate.');
      else toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="page-container mx-auto max-w-7xl">
      <PageHeader
        icon={ShieldCheck}
        title="Approval center"
        description="Review what the agents propose and decide. You stay accountable for every verdict."
        actions={
          <Button variant="outline" size="sm" onClick={() => setMine((m) => !m)}>
            {mine ? 'All' : 'Assigned to me'}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card className="p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Inbox className="h-4 w-4" /> Pending
          </h2>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !approvals?.length ? (
            <p className="text-sm text-muted-foreground">Nothing waiting on you.</p>
          ) : (
            <ul className="space-y-2">
              {approvals.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(a.id);
                      setReason('');
                    }}
                    className={`flex w-full items-center justify-between rounded-md border p-3 text-left text-sm hover:bg-muted/50 ${
                      selectedId === a.id ? 'border-primary' : 'border-border'
                    }`}
                  >
                    <span className="truncate">{GATE_LABEL[a.gate] ?? a.gate}</span>
                    <Badge className="bg-amber-500/15 text-amber-600">pending</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Review</h2>
          {!selected ? (
            <p className="text-sm text-muted-foreground">Select a pending item to review the evidence.</p>
          ) : (
            <div className="space-y-4">
              <Evidence approval={selected} />
              <Textarea
                placeholder="Reason (required to reject or request changes; recorded in the audit trail)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => onDecide('approve')} disabled={decide.isPending}>
                  {decide.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span className="ml-2">Approve</span>
                </Button>
                <Button variant="outline" onClick={() => onDecide('request_changes')} disabled={decide.isPending}>
                  <RotateCcw className="h-4 w-4" />
                  <span className="ml-2">Request changes</span>
                </Button>
                <Button variant="destructive" onClick={() => onDecide('reject')} disabled={decide.isPending}>
                  <X className="h-4 w-4" />
                  <span className="ml-2">Reject</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Separation of duties: the person who started the run can&apos;t approve its own gate.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
