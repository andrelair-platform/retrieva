'use client';

/**
 * Surveillance — live view of the CTPP surveillance agent's event feed (RTV-94/95/96).
 *
 * The agent watches third-party ICT providers for incidents, CVEs and breaches, recording each with a
 * blast-radius estimate. Each row is informational — acknowledge then resolve it. Nothing auto-rates
 * your risk; the feed only informs your risk view (the HITL boundary).
 */
import { toast } from 'sonner';
import { Radar, CheckCircle2, Check, ExternalLink, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/shared/api/client';
import {
  useSurveillanceEventsQuery,
  useAcknowledgeEventMutation,
  useResolveEventMutation,
} from '@/features/surveillance/queries/use-surveillance';
import type {
  SurveillanceEvent,
  SurveillanceSeverity,
  SurveillanceEventStatus,
} from '@/features/surveillance/api/surveillance';

const SEVERITY_CHIP: Record<SurveillanceSeverity, string> = {
  critical: 'bg-destructive/10 text-destructive',
  high: 'bg-warning-muted text-warning',
  medium: 'bg-chart-3/15 text-foreground',
  low: 'bg-info-muted text-info',
};

const STATUS_CHIP: Record<SurveillanceEventStatus, string> = {
  open: 'bg-warning-muted text-warning',
  acknowledged: 'bg-info-muted text-info',
  resolved: 'bg-success-muted text-success',
};

export function SurveillancePage() {
  const { data: events, isLoading } = useSurveillanceEventsQuery();
  const acknowledge = useAcknowledgeEventMutation();
  const resolve = useResolveEventMutation();

  const onAcknowledge = (e: SurveillanceEvent) => {
    acknowledge.mutate(e.id, {
      onSuccess: () => toast.success(`Acknowledged ${e.title || 'event'}`),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  };

  const onResolve = (e: SurveillanceEvent) => {
    resolve.mutate(e.id, {
      onSuccess: () => toast.success(`Resolved ${e.title || 'event'}`),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  };

  const openCount = (events ?? []).filter((e) => e.status === 'open').length;

  return (
    <div className="page-container mx-auto max-w-5xl">
      <PageHeader
        icon={Radar}
        title="Surveillance"
        description="Provider incidents and CVEs the surveillance agent is tracking. Acknowledge or resolve each — informs your risk view, never auto-rates."
        actions={openCount > 0 ? <Badge variant="outline">{openCount} open</Badge> : undefined}
      />

      {isLoading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !events?.length ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
          <Radar className="h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No events yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            When the surveillance agent detects an incident, CVE or breach affecting your third-party
            ICT providers, it will appear here for you to acknowledge and resolve.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {events.map((e) => {
            const ackBusy = acknowledge.isPending && acknowledge.variables === e.id;
            const resolveBusy = resolve.isPending && resolve.variables === e.id;
            return (
              <li key={e.id}>
                <Card>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium text-foreground">{e.title}</span>
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide',
                            SEVERITY_CHIP[e.severity]
                          )}
                        >
                          {e.severity}
                        </span>
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          {e.source}
                        </Badge>
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide',
                            STATUS_CHIP[e.status]
                          )}
                        >
                          {e.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{e.providerName}</p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{e.summary}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {e.url ? (
                        <Button asChild variant="ghost" size="sm">
                          <a href={e.url} target="_blank" rel="noreferrer">
                            Source
                            <ExternalLink className="ml-1 h-3.5 w-3.5" />
                          </a>
                        </Button>
                      ) : null}

                      {e.status === 'open' ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onAcknowledge(e)}
                            disabled={ackBusy}
                          >
                            {ackBusy ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Acknowledge
                          </Button>
                          <Button size="sm" onClick={() => onResolve(e)} disabled={resolveBusy}>
                            {resolveBusy ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Resolve
                          </Button>
                        </>
                      ) : e.status === 'acknowledged' ? (
                        <Button size="sm" onClick={() => onResolve(e)} disabled={resolveBusy}>
                          {resolveBusy ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Resolve
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
