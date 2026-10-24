'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PackageSearch, Plus, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getErrorMessage } from '@/shared/api/client';
import { arrangementsApi } from '@/features/arrangements/api/arrangements';
import { useEvaluationsQuery, useCreateEvaluation } from '@/features/evaluations/queries/use-evaluations';
import type { EvaluationStatus } from '@/features/evaluations/api/evaluations';

const STATUS_STYLE: Record<EvaluationStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  scoring: 'bg-blue-100 text-blue-700 border-blue-200',
  selected: 'bg-amber-100 text-amber-700 border-amber-200',
  onboarded: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-muted text-muted-foreground line-through',
};
const NONE = '__none__';

export function EvaluationsPage() {
  const router = useRouter();
  const { data: evaluations = [], isLoading } = useEvaluationsQuery();
  const create = useCreateEvaluation();
  const { data: entitiesRes } = useQuery({
    queryKey: ['legal-entities'],
    queryFn: () => arrangementsApi.listLegalEntities(),
  });
  const entities = entitiesRes?.data?.legalEntities ?? [];

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [need, setNeed] = useState('');
  const [legalEntityId, setLegalEntityId] = useState<string>(NONE);

  const reset = () => {
    setTitle('');
    setNeed('');
    setLegalEntityId(NONE);
    setOpen(false);
  };

  const submit = () =>
    create.mutate(
      { title: title.trim(), need: need.trim(), legalEntityId: legalEntityId === NONE ? null : legalEntityId },
      {
        onSuccess: (res) => {
          toast.success('Evaluation started');
          const id = res.data?.evaluation?.id;
          reset();
          if (id) router.push(`/evaluations/${id}`);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );

  if (isLoading) {
    return (
      <div className="page-container mx-auto max-w-5xl space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  return (
    <div className="page-container mx-auto max-w-5xl space-y-6">
      <PageHeader
        icon={PackageSearch}
        title="Onboard a new tool"
        description="Compare candidate vendors for a business need — Retrieva scores the DORA, security and concentration lane; you weigh functional fit, ease of use and cost. Pick the winner and it flows into due diligence."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Start an evaluation
          </Button>
        }
      />

      {evaluations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No evaluations yet. Start one to compare vendors for a need (e.g. “a team knowledge base”).
          </p>
        </div>
      ) : (
        <div className="rounded-md border divide-y">
          {evaluations.map((e) => (
            <button
              key={e.id}
              onClick={() => router.push(`/evaluations/${e.id}`)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{e.title}</p>
                {e.need && <p className="truncate text-xs text-muted-foreground">{e.need}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_STYLE[e.status]}`}>
                  {e.status}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : reset())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start a tool evaluation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="eval-title">What are you evaluating? *</Label>
              <Input
                id="eval-title"
                placeholder="e.g. Team knowledge base"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eval-need">The business need</Label>
              <Textarea
                id="eval-need"
                rows={3}
                placeholder="e.g. A shared knowledge base for the DE claims team to document procedures."
                value={need}
                onChange={(e) => setNeed(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eval-entity">Legal entity (who is adopting it)</Label>
              <Select value={legalEntityId} onValueChange={setLegalEntityId}>
                <SelectTrigger id="eval-entity">
                  <SelectValue placeholder="Select the sourcing entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not set yet</SelectItem>
                  {entities.map((en: { id: string; name: string }) => (
                    <SelectItem key={en.id} value={en.id}>
                      {en.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Required before you can select a winner (the arrangement needs its financial entity).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={reset}>
              Cancel
            </Button>
            <Button disabled={!title.trim() || create.isPending} onClick={submit}>
              {create.isPending ? 'Starting…' : 'Start'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
