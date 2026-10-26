'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, FileCheck2, Loader2, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  arrangementsApi,
  type GovernedArrangementProposal,
} from '@/features/arrangements/api/arrangements';
import { getErrorMessage } from '@/shared/api/client';

type Decision = 'approve' | 'reject' | 'request_changes';

export function ArrangementProposalQueue() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [justification, setJustification] = useState('');
  const proposalsQuery = useQuery({
    queryKey: ['arrangement-proposals'],
    queryFn: async () => (await arrangementsApi.listIntakeProposals()).data?.proposals ?? [],
  });
  const actionable = useMemo(
    () => proposalsQuery.data?.filter((p) => p.status === 'submitted' || p.status === 'checked') ?? [],
    [proposalsQuery.data]
  );
  const selected = actionable.find((p) => p.id === selectedId) ?? null;

  const decide = useMutation({
    mutationFn: async ({ proposal, decision }: { proposal: GovernedArrangementProposal; decision: Decision }) => {
      const body = { expectedVersion: proposal.rowVersion, decision, justification: justification.trim() };
      return proposal.status === 'submitted'
        ? arrangementsApi.checkIntakeProposal(proposal.id, body)
        : arrangementsApi.approveIntakeProposal(proposal.id, body);
    },
    onSuccess: async (_result, variables) => {
      toast.success(
        variables.proposal.status === 'submitted' ? 'Checker decision recorded.' : 'Approver decision recorded.'
      );
      setSelectedId(null);
      setJustification('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['arrangement-proposals'] }),
        queryClient.invalidateQueries({ queryKey: ['arrangements'] }),
      ]);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const onDecision = (decision: Decision) => {
    if (!selected) return;
    if (!justification.trim()) {
      toast.error('A justification is required for every governed decision.');
      return;
    }
    decide.mutate({ proposal: selected, decision });
  };

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <FileCheck2 className="h-4 w-4" /> Arrangement intake
        </h2>
        {proposalsQuery.isLoading ? (
          <div className="space-y-2"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
        ) : !actionable.length ? (
          <p className="text-sm text-muted-foreground">No arrangement proposals await a decision.</p>
        ) : (
          <ul className="space-y-2">
            {actionable.map((proposal) => (
              <li key={proposal.id}>
                <button
                  type="button"
                  onClick={() => { setSelectedId(proposal.id); setJustification(''); }}
                  className={`flex w-full items-center justify-between rounded-md border p-3 text-left text-sm hover:bg-muted/50 ${
                    selectedId === proposal.id ? 'border-primary' : 'border-border'
                  }`}
                >
                  <span className="truncate">
                    {proposal.proposal.providerName || 'Unnamed provider'} · {proposal.sourceFileName}
                  </span>
                  <Badge className={proposal.status === 'submitted' ? 'bg-amber-500/15 text-amber-600' : 'bg-blue-500/15 text-blue-600'}>
                    {proposal.status === 'submitted' ? 'check' : 'approve'}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">Arrangement review</h2>
        {!selected ? (
          <p className="text-sm text-muted-foreground">Select a proposal to inspect its AI draft and provenance.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">
                {selected.status === 'submitted' ? 'Independent checker review' : 'Accountable business approval'}
              </p>
              <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(selected.proposal, null, 2)}
              </pre>
              <p className="mt-2 text-xs text-muted-foreground">
                Version {selected.rowVersion} · maker {selected.preparedBy.slice(0, 8)}
                {selected.checkedBy ? ` · checker ${selected.checkedBy.slice(0, 8)}` : ''}
              </p>
            </div>
            <Textarea
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
              placeholder="Decision justification (required and retained in the audit trail)"
              rows={3}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onDecision('approve')} disabled={decide.isPending}>
                {decide.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span className="ml-2">{selected.status === 'submitted' ? 'Check' : 'Approve'}</span>
              </Button>
              <Button variant="outline" onClick={() => onDecision('request_changes')} disabled={decide.isPending}>
                <RotateCcw className="h-4 w-4" /><span className="ml-2">Request changes</span>
              </Button>
              <Button variant="destructive" onClick={() => onDecision('reject')} disabled={decide.isPending}>
                <X className="h-4 w-4" /><span className="ml-2">Reject</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Retrieva enforces different people for maker, checker, and approver.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
