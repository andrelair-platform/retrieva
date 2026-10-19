'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Activity, CheckCircle2, CircleDashed, Loader2, OctagonX, Pause, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/shared/api/client';
import {
  RUN_STAGES,
  type AssessmentRun,
  type RunStatus,
} from '@/features/assessment-runs/api/assessment-runs';
import {
  useAssessmentRunsQuery,
  useStartRunMutation,
} from '@/features/assessment-runs/queries/use-assessment-runs';
import { useRunUpdates } from '@/shared/realtime/use-run-updates';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_TONE: Record<RunStatus, string> = {
  queued: 'bg-muted text-muted-foreground',
  running: 'bg-blue-500/15 text-blue-600',
  resuming: 'bg-blue-500/15 text-blue-600',
  waiting_human: 'bg-amber-500/15 text-amber-600',
  blocked: 'bg-red-500/15 text-red-600',
  failed: 'bg-red-500/15 text-red-600',
  cancelled: 'bg-muted text-muted-foreground',
  done: 'bg-green-500/15 text-green-600',
};

function StatusBadge({ status }: { status: RunStatus }) {
  return <Badge className={STATUS_TONE[status]}>{status.replace('_', ' ')}</Badge>;
}

type StageState = 'done' | 'active' | 'waiting' | 'blocked' | 'pending';

// Map a run (status + currentNode) onto the fixed business pipeline — the operator sees stages, not
// raw model messages.
function stageState(run: AssessmentRun, stage: string): StageState {
  const si = RUN_STAGES.indexOf(stage as (typeof RUN_STAGES)[number]);
  const ci = RUN_STAGES.indexOf(run.currentNode as (typeof RUN_STAGES)[number]);
  if (run.status === 'done') return 'done';
  if (ci < 0) return si === 0 ? 'active' : 'pending';
  if (si < ci) return 'done';
  if (si > ci) return 'pending';
  if (run.status === 'waiting_human') return 'waiting';
  if (run.status === 'blocked' || run.status === 'failed' || run.status === 'cancelled') return 'blocked';
  return 'active';
}

const STAGE_ICON: Record<StageState, React.ReactNode> = {
  done: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  active: <Loader2 className="h-4 w-4 animate-spin text-blue-600" />,
  waiting: <Pause className="h-4 w-4 text-amber-600" />,
  blocked: <OctagonX className="h-4 w-4 text-red-600" />,
  pending: <CircleDashed className="h-4 w-4 text-muted-foreground" />,
};

const STAGE_LABEL: Record<string, string> = {
  intake: 'Intake',
  confirm_gate: 'Confirm arrangement',
  gap: 'Gap assessment',
  findings: 'Findings',
};

function RunStages({ run }: { run: AssessmentRun }) {
  return (
    <ol className="space-y-2">
      {RUN_STAGES.map((stage) => {
        const st = stageState(run, stage);
        return (
          <li key={stage} className="flex items-center gap-3 text-sm">
            {STAGE_ICON[st]}
            <span className={st === 'pending' ? 'text-muted-foreground' : ''}>{STAGE_LABEL[stage]}</span>
            {st === 'waiting' && <Badge className="bg-amber-500/15 text-amber-600">waiting on you</Badge>}
          </li>
        );
      })}
    </ol>
  );
}

export function AssessmentRunsPage() {
  useRunUpdates(); // live push (falls back to polling if the socket can't connect)
  const { data: runs, isLoading } = useAssessmentRunsQuery();
  const startRun = useStartRunMutation();
  const [arrangementId, setArrangementId] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(() => runs?.find((r) => r.id === selectedId) ?? null, [runs, selectedId]);

  const onStart = async () => {
    const id = arrangementId.trim();
    if (!UUID.test(id)) {
      toast.error('Enter a valid arrangement id (UUID).');
      return;
    }
    try {
      const summary = await startRun.mutateAsync(id);
      setArrangementId('');
      const newId = summary.data?.run?.id;
      if (newId) setSelectedId(newId);
      toast.success(summary.data?.waiting ? 'Run started — waiting for your review.' : 'Assessment run started.');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="page-container mx-auto max-w-7xl">
      <PageHeader
        icon={Activity}
        title="Assessment workspace"
        description="Start a DORA assessment and watch the agents work. You approve the key decisions."
      />

      <Card className="p-4">
        <label className="text-sm font-medium" htmlFor="arrangement-id">
          Assess an arrangement
        </label>
        <div className="mt-2 flex gap-2">
          <Input
            id="arrangement-id"
            placeholder="arrangement id (UUID)"
            value={arrangementId}
            onChange={(e) => setArrangementId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onStart()}
          />
          <Button onClick={onStart} disabled={startRun.isPending}>
            {startRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            <span className="ml-2">Start</span>
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Runs</h2>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !runs?.length ? (
            <p className="text-sm text-muted-foreground">No runs yet. Start one above.</p>
          ) : (
            <ul className="space-y-2">
              {runs.map((run) => (
                <li key={run.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(run.id)}
                    className={`flex w-full items-center justify-between rounded-md border p-3 text-left text-sm hover:bg-muted/50 ${
                      selectedId === run.id ? 'border-primary' : 'border-border'
                    }`}
                  >
                    <span className="truncate">
                      <span className="font-mono text-xs text-muted-foreground">{run.id.slice(0, 8)}</span>
                      <span className="ml-2">{run.currentNode}</span>
                    </span>
                    <StatusBadge status={run.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Progress</h2>
          {!selected ? (
            <p className="text-sm text-muted-foreground">Select a run to see its progress.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">{selected.id}</span>
                <StatusBadge status={selected.status} />
              </div>
              <RunStages run={selected} />
              {selected.statusMessage && (
                <p className="text-xs text-muted-foreground">{selected.statusMessage}</p>
              )}
              {selected.status === 'waiting_human' && (
                <a className="text-sm font-medium text-primary underline" href="/decision-inbox">
                  Go to the review queue →
                </a>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
