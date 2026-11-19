'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Network, Building2, ExternalLink, Plus, Sparkles, FileSpreadsheet, FolderUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
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
import { EstateImportDialog } from './estate-import-dialog';
import { DocumentTriageDialog } from './document-triage-dialog';

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
  const [estateOpen, setEstateOpen] = useState(false);
  const [triageOpen, setTriageOpen] = useState(false);
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
    <div className="page-container mx-auto max-w-7xl">
      <PageHeader
        title="ICT Arrangements"
        description="The DORA contractual arrangements — the core object risk is tracked against."
        actions={
          <>
            <Button size="sm" onClick={() => setEstateOpen(true)}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Import vendor list
            </Button>
            <Button size="sm" variant="outline" onClick={() => setTriageOpen(true)}>
              <FolderUp className="h-4 w-4 mr-2" />
              Upload documents
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIntakeOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              From contract
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </>
        }
      />

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
        <div className="mx-auto flex max-w-xl flex-col items-center justify-center gap-5 py-14 text-center">
          <Network className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="font-medium">Let&apos;s build your register</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with the list of ICT vendors you already have — import a spreadsheet, then drop in the
              documents you hold for each. No system access needed.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2">
            <button
              onClick={() => setEstateOpen(true)}
              className="group flex items-start gap-3 rounded-lg border bg-muted/30 p-4 text-left transition-colors hover:border-primary/30 hover:bg-muted/60"
            >
              <FileSpreadsheet className="mt-0.5 h-5 w-5 text-primary shrink-0" />
              <span>
                <span className="block text-sm font-medium">1 · Import your vendor list</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  One Excel/CSV → an arrangement per vendor.
                </span>
              </span>
            </button>
            <button
              onClick={() => setTriageOpen(true)}
              className="group flex items-start gap-3 rounded-lg border bg-muted/30 p-4 text-left transition-colors hover:border-primary/30 hover:bg-muted/60"
            >
              <FolderUp className="mt-0.5 h-5 w-5 text-primary shrink-0" />
              <span>
                <span className="block text-sm font-medium">2 · Upload your documents</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Drop a folder — we map each file to a vendor.
                </span>
              </span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Prefer one at a time? Use{' '}
            <button className="underline hover:text-foreground" onClick={() => setIntakeOpen(true)}>
              import from a contract
            </button>{' '}
            or{' '}
            <button className="underline hover:text-foreground" onClick={() => setFormOpen(true)}>
              add one manually
            </button>
            .
          </p>
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
      <EstateImportDialog open={estateOpen} onOpenChange={setEstateOpen} />
      <DocumentTriageDialog open={triageOpen} onOpenChange={setTriageOpen} />
    </div>
  );
}
