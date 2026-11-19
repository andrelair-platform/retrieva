'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UploadCloud, Loader2, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';

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
import { Badge } from '@/components/ui/badge';
import { getErrorMessage } from '@/shared/api/client';
import { discoveryApi, type GenericPreview, type GenericRunResult } from '@/features/discovery/api/discovery';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EstateUploadDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<GenericPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<GenericRunResult | null>(null);

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
      const res = await discoveryApi.genericPreview({ file: f });
      setPreview(res.data ?? null);
    } catch (e) {
      toast.error(getErrorMessage(e) || 'Could not read the export');
    } finally {
      setBusy(false);
    }
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await discoveryApi.genericRun({ file });
      setDone(res.data ?? null);
      await queryClient.invalidateQueries({ queryKey: ['discovery', 'proposals'] });
      toast.success(`${res.data?.normalised ?? 0} vendors sent to the inbox for review`);
    } catch (e) {
      toast.error(getErrorMessage(e) || 'Ingestion failed');
    } finally {
      setBusy(false);
    }
  };

  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload an estate export</DialogTitle>
          <DialogDescription>
            Upload a CSV/XLSX export of your ICT vendors from your own tool (SSO, procurement, CMDB…).
            Retrieva infers which column is the vendor name and proposes each as a register entry for you
            to confirm — nothing connects to your systems.
          </DialogDescription>
        </DialogHeader>

        {!done && (
          <div className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed py-8 text-center hover:border-primary/40">
              <UploadCloud className="h-8 w-8 text-muted-foreground/60" />
              <span className="text-sm">{file ? file.name : 'Choose a CSV / XLSX export'}</span>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              />
            </label>

            {busy && !preview && (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Inferring the column mapping…
              </div>
            )}

            {preview && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>
                    Vendor column: <strong>{preview.mapping.provider || '(none found)'}</strong>
                  </span>
                  <Badge variant={preview.usedFallback ? 'outline' : 'secondary'}>
                    {preview.usedFallback ? 'heuristic' : 'AI'} · {pct(preview.confidence)}
                  </Badge>
                  <span className="text-muted-foreground">· {preview.rowCount} rows</span>
                </div>

                {!preview.mapping.provider && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-600/30 bg-amber-600/5 p-2 text-xs">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                    No vendor-name column was found — check that your export has a provider/supplier column.
                  </div>
                )}

                {preview.sample.length > 0 && (
                  <div className="rounded-md border">
                    <p className="border-b px-3 py-1.5 text-xs text-muted-foreground">
                      Preview — first {preview.sample.length} vendors
                    </p>
                    <ul className="max-h-40 divide-y overflow-y-auto">
                      {preview.sample.map((a, i) => (
                        <li key={`${a.id}-${i}`} className="px-3 py-1.5 text-sm">
                          {a.label || a.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {done && (
          <div className="flex items-center gap-2 rounded-md border border-green-600/30 bg-green-600/5 p-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            {done.normalised} vendors sent to the inbox below — confirm each to add it to your register.
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
              <Button onClick={run} disabled={busy || !preview || !preview.mapping.provider}>
                {busy && preview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {preview ? `Add ${preview.rowCount} vendors to the inbox` : 'Upload'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
