'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Network, Building2, ExternalLink, Plus, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LifecycleStatus } from '@/features/arrangements/api/arrangements';
import { useArrangementsQuery } from '@/features/arrangements/queries/use-arrangements-query';
import { CriticalityBadge, ArrangementTypeBadge, LifecycleBadge } from './badges';
import { ArrangementForm } from './arrangement-form';
import { IntakeDialog } from './intake-dialog';

const LIFECYCLE_FILTERS: Array<{ value: LifecycleStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All states' },
  { value: 'prospect', label: 'Prospects' },
  { value: 'due_diligence', label: 'Due diligence' },
  { value: 'active', label: 'Active' },
  { value: 'under_review', label: 'Under review' },
  { value: 'remediation', label: 'Remediation' },
  { value: 'exiting', label: 'Exiting' },
  { value: 'exited', label: 'Exited' },
];

export function ArrangementsPage() {
  const router = useRouter();
  const { data: arrangements = [], isLoading } = useArrangementsQuery();
  const [formOpen, setFormOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [lifecycle, setLifecycle] = useState<LifecycleStatus | 'all'>('all');

  const cifCount = useMemo(
    () => arrangements.filter((a) => a.criticalOrImportant || a.criticality === 'critical' || a.criticality === 'important').length,
    [arrangements]
  );
  const activeCount = useMemo(
    () => arrangements.filter((a) => a.lifecycleStatus === 'active').length,
    [arrangements]
  );

  const rows = useMemo(
    () => (lifecycle === 'all' ? arrangements : arrangements.filter((a) => a.lifecycleStatus === lifecycle)),
    [arrangements, lifecycle]
  );

  return (
    <div className="page-container max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">ICT Arrangements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The DORA contractual arrangements — the core object risk is tracked against.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setIntakeOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Import from contract
          </Button>
          <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New arrangement
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 text-center">
          <p className="text-3xl font-bold">{arrangements.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Arrangements</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{activeCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Active</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-3xl font-bold text-amber-600">{cifCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Critical / important function</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : arrangements.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Network className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No arrangements yet.</p>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            Create your first arrangement
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {rows.length} of {arrangements.length} shown
            </p>
            <Select value={lifecycle} onValueChange={(v) => setLifecycle(v as LifecycleStatus | 'all')}>
              <SelectTrigger className="h-8 w-[180px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIFECYCLE_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Legal entity</TableHead>
                  <TableHead>Function</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Lifecycle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Criticality</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                      No arrangements in this state.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((a) => (
                    <TableRow
                      key={a.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/arrangements/${a.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {a.legalEntityName ?? '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{a.businessFunctionName ?? '—'}</TableCell>
                      <TableCell className="text-sm">{a.providerName ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.ictServiceName ?? '—'}</TableCell>
                      <TableCell>
                        <LifecycleBadge value={a.lifecycleStatus} />
                      </TableCell>
                      <TableCell>
                        <ArrangementTypeBadge value={a.arrangementType} />
                      </TableCell>
                      <TableCell>
                        <CriticalityBadge value={a.criticality} />
                      </TableCell>
                      <TableCell>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <ArrangementForm open={formOpen} onOpenChange={setFormOpen} />
      <IntakeDialog open={intakeOpen} onOpenChange={setIntakeOpen} />
    </div>
  );
}
