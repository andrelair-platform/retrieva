'use client';

/**
 * Contract Amendments — live view of the contract-amendment redliner's draft inbox (RTV-97/98).
 *
 * For missing or weak DORA Art. 30 obligations the redliner drafts an amendment clause against a
 * template. Each row is a DRAFT; accepting or rejecting it is the HITL boundary — nothing is applied
 * automatically.
 */
import { toast } from 'sonner';
import { FileSignature, Check, X, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/shared/api/client';
import {
  useAmendmentsQuery,
  useAcceptAmendmentMutation,
  useRejectAmendmentMutation,
} from '@/features/contract-amendments/queries/use-contract-amendments';
import type {
  ContractAmendment,
  AmendmentGapLevel,
  AmendmentStatus,
} from '@/features/contract-amendments/api/contract-amendments';

const GAP_BADGE: Record<AmendmentGapLevel, string> = {
  missing: 'bg-destructive/10 text-destructive',
  partial: 'bg-warning-muted text-warning',
};

const STATUS_BADGE: Record<AmendmentStatus, string> = {
  pending: 'bg-warning-muted text-warning',
  accepted: 'bg-success-muted text-success',
  rejected: 'bg-muted text-muted-foreground',
};

export function ContractAmendmentsPage() {
  const { data: amendments, isLoading } = useAmendmentsQuery();
  const accept = useAcceptAmendmentMutation();
  const reject = useRejectAmendmentMutation();

  const onAccept = (a: ContractAmendment) => {
    accept.mutate(a.id, {
      onSuccess: () => toast.success(`Accepted amendment for ${a.vendorName}`),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  const onReject = (a: ContractAmendment) => {
    reject.mutate(a.id, {
      onSuccess: () => toast.success(`Rejected amendment for ${a.vendorName}`),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  const pendingCount = (amendments ?? []).filter((a) => a.status === 'pending').length;

  return (
    <div className="page-container mx-auto max-w-5xl">
      <PageHeader
        icon={FileSignature}
        title="Contract Amendments"
        description="Art. 30 amendment clauses the redliner drafted for missing or weak DORA obligations. Accept or reject each draft."
        actions={pendingCount > 0 ? <Badge variant="outline">{pendingCount} to review</Badge> : undefined}
      />

      {isLoading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !amendments?.length ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
          <FileSignature className="h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No amendments drafted yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            When the redliner finds a missing or weak Art. 30 obligation in an assessed contract, the
            amendment clause it drafts will appear here for you to accept or reject.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {amendments.map((a) => (
            <li key={a.id}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{a.vendorName}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {a.article}
                    </Badge>
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide',
                        GAP_BADGE[a.gapLevel]
                      )}
                    >
                      {a.gapLevel}
                    </span>
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide',
                        STATUS_BADGE[a.status]
                      )}
                    >
                      {a.status}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">{a.category}</p>

                  <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">
                    {a.draftText}
                  </p>

                  <p className="mt-2 text-xs text-muted-foreground">Why: {a.rationale}</p>

                  {a.status === 'pending' ? (
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => onAccept(a)}
                        disabled={accept.isPending && accept.variables === a.id}
                      >
                        {accept.isPending && accept.variables === a.id ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Accept
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
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
