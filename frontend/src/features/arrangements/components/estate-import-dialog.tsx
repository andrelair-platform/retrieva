'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UploadCloud, FileDown, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/shared/api/client';
import { arrangementsApi, type EstateImportSummary } from '@/features/arrangements/api/arrangements';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// The columns estateImport accepts (required first). Kept in sync with the backend COLUMN_ALIASES.
const TEMPLATE_HEADERS = [
  'legalEntityName',
  'businessFunctionName',
  'providerName',
  'ictServiceName',
  'criticality',
  'dataResidency',
  'dataClasses',
  'subcontractors',
  'arrangementType',
  'criticalOrImportant',
];
const TEMPLATE_EXAMPLE = [
  'ACME Insurance SE',
  'Claims Handling',
  'Amazon Web Services',
  'S3 storage',
  'critical',
  'EU (Ireland)',
  'pii;claims',
  'Datadog;Cloudflare',
  'external',
  'true',
];

function downloadTemplate() {
  const csv = `${TEMPLATE_HEADERS.join(',')}\n${TEMPLATE_EXAMPLE.join(',')}\n`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'retrieva-vendor-list-template.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function EstateImportDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<EstateImportSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<EstateImportSummary | null>(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setDone(null);
    setBusy(false);
  };
  const close = () => {
    onOpenChange(false);
    setTimeout(reset, 200);
  };

  const onPick = async (f: File | null) => {
    setFile(f);
    setPreview(null);
    setDone(null);
    if (!f) return;
    setBusy(true);
    try {
      const res = await arrangementsApi.importEstate(f, true); // dry-run
      setPreview(res.data ?? null);
    } catch (e) {
      toast.error(getErrorMessage(e) || 'Could not read the file');
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await arrangementsApi.importEstate(file, false);
      setDone(res.data ?? null);
      await queryClient.invalidateQueries({ queryKey: ['arrangements'] });
      toast.success(`Imported ${res.data?.created ?? 0} arrangements`);
    } catch (e) {
      toast.error(getErrorMessage(e) || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const summary = done ?? preview;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import your vendor list</DialogTitle>
          <DialogDescription>
            Upload one spreadsheet (Excel or CSV) of your ICT vendors — Retrieva creates an arrangement
            per row. Re-running is safe: existing vendors are skipped as duplicates.
          </DialogDescription>
        </DialogHeader>

        {!done && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border border-dashed p-3">
              <div className="text-sm">
                <p className="font-medium">Need the format?</p>
                <p className="text-xs text-muted-foreground">
                  Required columns: legal entity · business function · provider.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={downloadTemplate}>
                <FileDown className="mr-2 h-4 w-4" /> Download template
              </Button>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed py-8 text-center hover:border-primary/40">
              <UploadCloud className="h-8 w-8 text-muted-foreground/60" />
              <span className="text-sm">{file ? file.name : 'Choose a CSV / XLSX file'}</span>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        )}

        {busy && !summary && (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading your file…
          </div>
        )}

        {summary && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-semibold text-green-600">{summary.created}</p>
                <p className="text-xs text-muted-foreground">{done ? 'created' : 'to create'}</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-semibold">{summary.duplicates}</p>
                <p className="text-xs text-muted-foreground">duplicates</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-semibold text-destructive">{summary.errors.length}</p>
                <p className="text-xs text-muted-foreground">rows with errors</p>
              </div>
            </div>

            {summary.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-md border">
                {summary.errors.slice(0, 50).map((e) => (
                  <div key={e.row} className="flex items-start gap-2 border-b px-3 py-2 text-xs last:border-0">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                    <span>
                      <span className="font-medium">Row {e.row}</span>
                      {e.provider ? ` · ${e.provider}` : ''} — {e.messages.join('; ')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {done && (
              <div className="flex items-center gap-2 rounded-md border border-green-600/30 bg-green-600/5 p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                {done.created} arrangements added to your register.
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {done ? (
            <Button onClick={close}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={close} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={doImport} disabled={busy || !preview || preview.created === 0}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {preview ? `Import ${preview.created} arrangements` : 'Import'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
