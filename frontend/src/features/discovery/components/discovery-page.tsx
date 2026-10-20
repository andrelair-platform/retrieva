'use client';

/**
 * Discovery — live view of the discovery agent's proposal inbox (RTV-91/106/107).
 *
 * The agent sweeps connected source systems and proposes Register-of-Information entries. Each row is
 * a DRAFT proposal; confirming it creates the arrangement (the HITL boundary — nothing is auto-added).
 */
import Link from 'next/link';
import { toast } from 'sonner';
import { Radio, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/shared/api/client';
import {
  useDiscoveryProposalsQuery,
  useConfirmProposalMutation,
} from '@/features/discovery/queries/use-discovery';
import type { DiscoveryProposal, DiscoveryProposalStatus } from '@/features/discovery/api/discovery';

const STATUS_BADGE: Record<DiscoveryProposalStatus, string> = {
  pending: 'bg-warning-muted text-warning',
  confirmed: 'bg-success-muted text-success',
  dismissed: 'bg-muted text-muted-foreground',
};

function proposalNote(p: DiscoveryProposal): string {
  const prop = p.proposal || {};
  const bits = [
    typeof prop.businessFunctionName === 'string' ? prop.businessFunctionName : '',
    typeof prop.providerType === 'string' ? prop.providerType : '',
    typeof prop.criticality === 'string' ? prop.criticality : '',
  ].filter(Boolean);
  return bits.join(' · ');
}

export function DiscoveryPage() {
  const { data: proposals, isLoading } = useDiscoveryProposalsQuery();
  const confirm = useConfirmProposalMutation();

  const onConfirm = (p: DiscoveryProposal) => {
    confirm.mutate(p.id, {
      onSuccess: () => toast.success(`Added ${p.externalName || 'proposal'} to the register`),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  const pending = (proposals ?? []).filter((p) => p.status === 'pending').length;

  return (
    <div className="page-container mx-auto max-w-5xl">
      <PageHeader
        icon={Radio}
        title="Discovery"
        description="Third-party ICT the discovery agent found across your source systems. Confirm a proposal to add it to your Register of Information — nothing is added automatically."
        actions={pending > 0 ? <Badge variant="outline">{pending} awaiting review</Badge> : undefined}
      />

      {isLoading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !proposals?.length ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
          <Radio className="h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No proposals yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            When the discovery agent sweeps your connected source systems, the third-party ICT it finds
            will appear here for you to confirm into the register.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {proposals.map((p) => {
            const note = proposalNote(p);
            return (
              <li key={p.id}>
                <Card>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium text-foreground">
                          {p.externalName || p.externalId}
                        </span>
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          {p.source}
                        </Badge>
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide',
                            STATUS_BADGE[p.status]
                          )}
                        >
                          {p.status}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {note || 'Proposed arrangement — verify and confirm.'}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {p.status === 'confirmed' && p.arrangementId ? (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/arrangements/${p.arrangementId}`}>
                            View arrangement
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      ) : p.status === 'pending' ? (
                        <Button
                          size="sm"
                          onClick={() => onConfirm(p)}
                          disabled={confirm.isPending && confirm.variables === p.id}
                        >
                          {confirm.isPending && confirm.variables === p.id ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Confirm
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
