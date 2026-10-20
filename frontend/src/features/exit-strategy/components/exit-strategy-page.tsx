'use client';

/**
 * Exit Strategy — live view of the exit-strategy agents' draft inbox (RTV-99/100/101/102).
 *
 * For each critical-or-important function the agents draft exit artefacts — substitute providers,
 * exit blueprints, reintegration models. Each row is a DRAFT; the human approves or rejects it (the
 * HITL boundary — nothing is applied automatically).
 */
import Link from 'next/link';
import { toast } from 'sonner';
import { DoorOpen, Check, X, ArrowRight, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/shared/api/client';
import {
  useExitArtefactsQuery,
  useApproveArtefactMutation,
  useRejectArtefactMutation,
} from '@/features/exit-strategy/queries/use-exit-strategy';
import type { ExitArtefact, ExitArtefactStatus, ExitArtefactType } from '@/features/exit-strategy/api/exit-strategy';

const TYPE_LABEL: Record<ExitArtefactType, string> = {
  provider_match: 'Substitute providers',
  exit_blueprint: 'Exit blueprint',
  reintegration_model: 'Reintegration model',
};

const STATUS_BADGE: Record<ExitArtefactStatus, string> = {
  draft: 'bg-warning-muted text-warning',
  approved: 'bg-success-muted text-success',
  rejected: 'bg-muted text-muted-foreground',
};

export function ExitStrategyPage() {
  const { data: artefacts, isLoading } = useExitArtefactsQuery();
  const approve = useApproveArtefactMutation();
  const reject = useRejectArtefactMutation();

  const onApprove = (a: ExitArtefact) => {
    approve.mutate(a.id, {
      onSuccess: () => toast.success(`Approved ${a.providerName || 'artefact'}`),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  const onReject = (a: ExitArtefact) => {
    reject.mutate(a.id, {
      onSuccess: () => toast.success(`Rejected ${a.providerName || 'artefact'}`),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  const draftCount = (artefacts ?? []).filter((a) => a.status === 'draft').length;

  return (
    <div className="page-container mx-auto max-w-5xl">
      <PageHeader
        icon={DoorOpen}
        title="Exit Strategy"
        description="Exit artefacts the agent drafted for your critical-or-important functions — substitutes, exit blueprints, reintegration models. Approve or reject each draft."
        actions={draftCount > 0 ? <Badge variant="outline">{draftCount} drafts</Badge> : undefined}
      />

      {isLoading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !artefacts?.length ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
          <DoorOpen className="h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No exit artefacts yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            When the exit-strategy agent drafts substitutes, exit blueprints, and reintegration models
            for your critical-or-important functions, they will appear here for you to approve or reject.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {artefacts.map((a) => (
            <li key={a.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-foreground">
                        {a.providerName}
                      </span>
                      <Badge variant="outline">{TYPE_LABEL[a.type]}</Badge>
                      <span
                        className={cn(
                          'rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide',
                          STATUS_BADGE[a.status]
                        )}
                      >
                        {a.status}
                      </span>
                      {a.criticality ? (
                        <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                          {a.criticality}
                        </span>
                      ) : null}
                      {a.usedFallback === 'true' ? (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          deterministic fallback
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {a.summary || 'Drafted exit artefact — review and decide.'}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/arrangements/${a.arrangementId}`}>
                        View arrangement
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    {a.status === 'draft' ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => onApprove(a)}
                          disabled={approve.isPending && approve.variables === a.id}
                        >
                          {approve.isPending && approve.variables === a.id ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReject(a)}
                          disabled={reject.isPending && reject.variables === a.id}
                        >
                          {reject.isPending && reject.variables === a.id ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Reject
                        </Button>
                      </>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
