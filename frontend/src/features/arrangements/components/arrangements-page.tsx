'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Network, Building2, ExternalLink, Plus } from 'lucide-react';

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
import { useArrangementsQuery } from '@/features/arrangements/queries/use-arrangements-query';
import { CriticalityBadge, ArrangementTypeBadge } from './badges';
import { ArrangementForm } from './arrangement-form';

export function ArrangementsPage() {
  const router = useRouter();
  const { data: arrangements = [], isLoading } = useArrangementsQuery();
  const [formOpen, setFormOpen] = useState(false);

  const cifCount = useMemo(
    () => arrangements.filter((a) => a.criticalOrImportant || a.criticality === 'critical' || a.criticality === 'important').length,
    [arrangements]
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
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New arrangement
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border p-4 text-center">
          <p className="text-3xl font-bold">{arrangements.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Arrangements</p>
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
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px]">Legal entity</TableHead>
                <TableHead>Function</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Criticality</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arrangements.map((a) => (
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
                    <ArrangementTypeBadge value={a.arrangementType} />
                  </TableCell>
                  <TableCell>
                    <CriticalityBadge value={a.criticality} />
                  </TableCell>
                  <TableCell>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ArrangementForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
