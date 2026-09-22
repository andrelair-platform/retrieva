'use client';

import { useMemo } from 'react';
import { BookText, FileDown, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { registerApi, type RegisterRow } from '@/features/register/api/register';
import { useRegisterQuery } from '@/features/register/queries/use-register-query';

const TEMPLATE_LABELS: Record<string, string> = {
  B_01: 'Entity',
  B_02: 'Arrangements',
  B_03: 'Intra-group',
  B_05: 'Providers',
  subcontracting: 'Subcontracting',
};

const humanize = (k: string) =>
  k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

const columnsOf = (rows: RegisterRow[]): string[] =>
  rows.length === 0 ? [] : Object.keys(rows[0]).filter((k) => !k.startsWith('_'));

function cell(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

function TemplateTable({ rows }: { rows: RegisterRow[] }) {
  const cols = useMemo(() => columnsOf(rows), [rows]);
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground py-8 text-center">No rows — this template is empty until arrangements exist.</p>;
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>{cols.map((c) => <TableHead key={c} className="whitespace-nowrap">{humanize(c)}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              {cols.map((c) => <TableCell key={c} className="text-sm whitespace-nowrap">{cell(r[c])}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function RegisterPage() {
  const { data: register, isLoading } = useRegisterQuery();

  const templateKeys = register ? Object.keys(register.templates).filter((k) => k in TEMPLATE_LABELS) : [];

  return (
    <div className="page-container max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><BookText className="h-5 w-5" /> Register of Information</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            DORA RT.02.01 — generated on demand from the arrangement graph{register ? ` · ${register.version}` : ''}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => registerApi.export('xlsx')}>
            <FileDown className="h-4 w-4 mr-2" /> Export XLSX
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : !register ? (
        <p className="text-sm text-muted-foreground">Could not load the register.</p>
      ) : (
        <Tabs defaultValue={templateKeys[0] ?? 'gaps'}>
          <TabsList className="flex-wrap h-auto">
            {templateKeys.map((k) => (
              <TabsTrigger key={k} value={k}>
                {TEMPLATE_LABELS[k]}
                <Badge variant="secondary" className="ml-1.5 text-[10px]">{register.templates[k].length}</Badge>
              </TabsTrigger>
            ))}
            <TabsTrigger value="gaps">
              Gaps
              {register.gaps.length > 0 && <Badge variant="destructive" className="ml-1.5 text-[10px]">{register.gaps.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {templateKeys.map((k) => (
            <TabsContent key={k} value={k} className="space-y-2">
              <div className="flex justify-end">
                <Button size="sm" variant="ghost" onClick={() => registerApi.export('csv', k)}>
                  <FileDown className="h-3.5 w-3.5 mr-1.5" /> CSV
                </Button>
              </div>
              <TemplateTable rows={register.templates[k]} />
            </TabsContent>
          ))}

          <TabsContent value="gaps">
            {register.gaps.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No gaps — every required field is populated.</p>
            ) : (
              <div className="rounded-md border divide-y">
                {register.gaps.map((g, i) => (
                  <div key={i} className="px-3 py-2 text-sm flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <Badge variant="outline" className="text-[10px]">{g.template}</Badge>
                    <span className="font-medium">{g.label}</span>
                    <span className="text-muted-foreground text-xs">{g.ref ?? ''}</span>
                    <span className="text-muted-foreground text-xs ml-auto">{g.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
