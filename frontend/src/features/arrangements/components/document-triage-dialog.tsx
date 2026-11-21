'use client';

import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FolderUp, FilePlus2, Loader2, CheckCircle2, Sparkles } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getErrorMessage } from '@/shared/api/client';
import { arrangementsApi, type EvidenceCategory } from '@/features/arrangements/api/arrangements';
import { useArrangementsQuery } from '@/features/arrangements/queries/use-arrangements-query';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  master_service_agreement: 'Master Service Agreement',
  dora_addendum: 'DORA Addendum',
  soc2_report: 'SOC 2 report',
  iso27001_cert: 'ISO 27001',
  vendor_dora_attestation: 'DORA attestation',
  subprocessor_list: 'Subprocessor list',
  bcp_dr_plan: 'BCP / DR plan',
  exit_strategy: 'Exit strategy',
  risk_classification: 'Risk classification',
};
const CATEGORIES = Object.keys(CATEGORY_LABELS) as EvidenceCategory[];
const UNASSIGNED = '__unassigned__';
const NO_CATEGORY = '__none__';

interface Row {
  file: File;
  filename: string;
  relativePath?: string;
  arrangementId: string | null;
  category: EvidenceCategory | null;
  confidence: number;
  matchSource: string;
  identifying?: boolean; // Layer-2 content-identify in progress
}

const relPath = (f: File): string | undefined =>
  // webkitRelativePath is set when a folder is chosen
  (f as File & { webkitRelativePath?: string }).webkitRelativePath || undefined;

// `webkitdirectory`/`directory` are non-standard <input> attributes (folder upload) not in React's types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional: non-standard DOM attributes
const FOLDER_ATTRS: any = { webkitdirectory: '', directory: '' };

type TriageResult = { uploaded: number; skipped: number; failed: number };

function resultSuffix(result: TriageResult) {
  return {
    skipped: result.skipped ? ` · ${result.skipped} skipped` : '',
    failed: result.failed ? ` · ${result.failed} failed` : '',
  };
}

function deriveTriageView(args: {
  files: File[];
  rows: Row[] | null;
  progress: { done: number; total: number } | null;
  result: TriageResult | null;
}) {
  const { files, rows, progress, result } = args;
  const assignable = (rows ?? []).filter((r) => r.arrangementId);
  const hasProgress = !!progress;
  return {
    assignable,
    hasProgress,
    showFilePicker: files.length > 0 && !rows,
    commitDisabled: !rows || assignable.length === 0 || hasProgress,
    suffix: resultSuffix(result ?? { uploaded: 0, skipped: 0, failed: 0 }),
  };
}

export function DocumentTriageDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: arrangements = [] } = useArrangementsQuery();
  const folderRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ uploaded: number; skipped: number; failed: number } | null>(null);

  const vendorOptions = useMemo(
    () =>
      arrangements.map((a) => ({
        id: a.id,
        label: `${a.providerName ?? '(provider)'}${a.businessFunctionName ? ` · ${a.businessFunctionName}` : ''}`,
      })),
    [arrangements]
  );

  const reset = () => {
    setFiles([]);
    setRows(null);
    setAnalyzing(false);
    setProgress(null);
    setResult(null);
  };
  const close = () => {
    onOpenChange(false);
    setTimeout(reset, 200);
  };

  const onFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
    setRows(null);
    setResult(null);
  };

  const analyze = async () => {
    if (files.length === 0) return;
    setAnalyzing(true);
    try {
      const res = await arrangementsApi.triageDocuments(
        files.map((f) => ({ filename: f.name, relativePath: relPath(f) }))
      );
      const proposals = res.data?.proposals ?? [];
      setRows(
        files.map((f, i) => {
          const p = proposals[i];
          return {
            file: f,
            filename: f.name,
            relativePath: relPath(f),
            arrangementId: p?.proposedArrangementId ?? null,
            category: p?.proposedCategory ?? null,
            confidence: p?.confidence ?? 0,
            matchSource: p?.matchSource ?? 'none',
          };
        })
      );
    } catch (e) {
      toast.error(getErrorMessage(e) || 'Could not analyze the documents');
    } finally {
      setAnalyzing(false);
    }
  };

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => (rs ? rs.map((r, j) => (j === i ? { ...r, ...patch } : r)) : rs));

  // Layer 2: for a row the name pass couldn't place, upload the file so the backend reads its text,
  // extracts the provider name and matches it to a vendor.
  const identifyFromContent = async (i: number) => {
    const row = rows?.[i];
    if (!row) return;
    setRow(i, { identifying: true });
    try {
      const res = await arrangementsApi.triageDocumentContent(row.file);
      const d = res.data;
      if (d?.proposedArrangementId) {
        setRow(i, { arrangementId: d.proposedArrangementId, matchSource: 'content', confidence: d.confidence });
        toast.success(`Matched to ${d.proposedProviderName}`);
      } else if (d?.extractedProviderName) {
        toast.message(`Found "${d.extractedProviderName}" — no matching vendor; assign manually`);
      } else {
        toast.message('No vendor name could be read from this document');
      }
    } catch (e) {
      toast.error(getErrorMessage(e) || 'Could not read the document');
    } finally {
      setRow(i, { identifying: false });
    }
  };

  const { assignable, hasProgress, showFilePicker, commitDisabled, suffix } = deriveTriageView({
    files,
    rows,
    progress,
    result,
  });

  const commit = async () => {
    const todo = assignable;
    if (todo.length === 0) return;
    setProgress({ done: 0, total: todo.length });
    let uploaded = 0;
    let failed = 0;
    for (let i = 0; i < todo.length; i++) {
      const r = todo[i];
      try {
        await arrangementsApi.ingestEvidence(r.arrangementId!, r.file, r.category);
        uploaded++;
      } catch {
        failed++;
      }
      setProgress({ done: i + 1, total: todo.length });
    }
    const skipped = (rows?.length ?? 0) - todo.length;
    setResult({ uploaded, skipped, failed });
    await queryClient.invalidateQueries({ queryKey: ['arrangements'] });
    if (uploaded) toast.success(`Uploaded ${uploaded} documents`);
    if (failed) toast.error(`${failed} documents failed to upload`);
  };

  const matchBadge = (src: string, conf: number) => {
    if (src === 'folder' || src === 'filename') return <Badge variant="secondary">matched {Math.round(conf * 100)}%</Badge>;
    if (src === 'content') return <Badge variant="secondary">content {Math.round(conf * 100)}%</Badge>;
    if (src === 'token') return <Badge variant="outline">guess {Math.round(conf * 100)}%</Badge>;
    return <Badge variant="outline">unassigned</Badge>;
  };

  const handleOpenChange = (o: boolean) => {
    if (o) onOpenChange(o);
    else close();
  };

  const renderFooter = () => {
    if (result) return <Button onClick={close}>Done</Button>;
    return (
      <>
        <Button variant="ghost" onClick={close} disabled={hasProgress}>
          Cancel
        </Button>
        <Button onClick={commit} disabled={commitDisabled}>
          {progress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Upload {assignable.length} documents
        </Button>
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Bulk-upload documents</DialogTitle>
          <DialogDescription>
            Drop a folder of your vendor documents (contracts, SOC 2, ISO, DORA addenda). Retrieva matches
            each file to a vendor and DORA category — review the grid, fix anything, then upload. Tip:
            folders named after each vendor match best.
          </DialogDescription>
        </DialogHeader>

        {!result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => folderRef.current?.click()}
                disabled={hasProgress}
              >
                <FolderUp className="mr-2 h-4 w-4" /> Select folder
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => filesRef.current?.click()}
                disabled={hasProgress}
              >
                <FilePlus2 className="mr-2 h-4 w-4" /> Add files
              </Button>
              {showFilePicker && (
                <Button size="sm" onClick={analyze} disabled={analyzing}>
                  {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Analyze {files.length} files
                </Button>
              )}
              <input
                ref={folderRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
                {...FOLDER_ATTRS}
              />
              <input
                ref={filesRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
              />
            </div>

            {showFilePicker && (
              <p className="text-xs text-muted-foreground">{files.length} files selected across your folders.</p>
            )}

            {rows && (
              <div className="max-h-[22rem] overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/50 text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Document</th>
                      <th className="px-3 py-2 text-left font-medium">Vendor</th>
                      <th className="px-3 py-2 text-left font-medium">Category</th>
                      <th className="px-3 py-2 text-left font-medium">Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={`${r.relativePath ?? r.filename}-${i}`} className="border-t">
                        <td className="max-w-[16rem] truncate px-3 py-1.5" title={r.relativePath ?? r.filename}>
                          {r.filename}
                        </td>
                        <td className="px-3 py-1.5">
                          <Select
                            value={r.arrangementId ?? UNASSIGNED}
                            onValueChange={(v) => setRow(i, { arrangementId: v === UNASSIGNED ? null : v })}
                          >
                            <SelectTrigger className="h-8 w-[200px] text-xs">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={UNASSIGNED}>— Skip (unassigned) —</SelectItem>
                              {vendorOptions.map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  {v.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-1.5">
                          <Select
                            value={r.category ?? NO_CATEGORY}
                            onValueChange={(v) => setRow(i, { category: v === NO_CATEGORY ? null : (v as EvidenceCategory) })}
                          >
                            <SelectTrigger className="h-8 w-[180px] text-xs">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_CATEGORY}>— None —</SelectItem>
                              {CATEGORIES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {CATEGORY_LABELS[c]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-2">
                            {matchBadge(r.matchSource, r.confidence)}
                            {!r.arrangementId && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                disabled={r.identifying}
                                onClick={() => identifyFromContent(i)}
                                title="Read the document to find the vendor"
                              >
                                {r.identifying ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Sparkles className="h-3.5 w-3.5" />
                                )}
                                <span className="ml-1">Identify</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {rows && (
              <p className="text-xs text-muted-foreground">
                {assignable.length} of {rows.length} will be uploaded · {rows.length - assignable.length} skipped
                (unassigned). Assign a vendor to include a document.
              </p>
            )}

            {progress && (
              <div className="space-y-1">
                <Progress value={(progress.done / progress.total) * 100} />
                <p className="text-xs text-muted-foreground">
                  Uploading {progress.done} / {progress.total}…
                </p>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="flex items-center gap-2 rounded-md border border-green-600/30 bg-green-600/5 p-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            {result.uploaded} documents uploaded
            {suffix.skipped}
            {suffix.failed}.
          </div>
        )}

        <DialogFooter>{renderFooter()}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
