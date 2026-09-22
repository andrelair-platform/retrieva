'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Play, Plus, FileText, ShieldCheck, Check, X, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/lib/api/client';
import { arrangementsApi } from '@/features/arrangements/api/arrangements';
import {
  useArrangementQuery,
  useArrangementEvidenceQuery,
  useFindingsQuery,
} from '@/features/arrangements/queries/use-arrangements-query';
import { CriticalityBadge, ArrangementTypeBadge, VerdictBadge } from './badges';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium mt-0.5">{value ?? '—'}</div>
    </div>
  );
}

export function ArrangementDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [evOpen, setEvOpen] = useState(false);
  const [doc, setDoc] = useState('');
  const [src, setSrc] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const assess = useMutation({
    mutationFn: () => arrangementsApi.runAssessment(id),
    onSuccess: () => {
      toast.success('Assessment queued — findings will appear shortly');
      qc.invalidateQueries({ queryKey: ['findings', id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const { data: arrangement, isLoading } = useArrangementQuery(id);
  const { data: evidence = [] } = useArrangementEvidenceQuery(id);
  // Poll findings after a run is triggered; useFindingsQuery stops once findings appear.
  const assessing = assess.isSuccess;
  const { data: findings = [] } = useFindingsQuery(id, assessing);

  const attach = useMutation({
    mutationFn: () => arrangementsApi.attachEvidence(id, { document: doc.trim(), source: src.trim() }),
    onSuccess: () => {
      toast.success('Evidence attached');
      setDoc('');
      setSrc('');
      setEvOpen(false);
      qc.invalidateQueries({ queryKey: ['arrangement-evidence', id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const ingest = useMutation({
    mutationFn: (f: File) => arrangementsApi.ingestEvidence(id, f),
    onSuccess: () => {
      toast.success('Document ingested — the next assessment can cite it');
      setEvOpen(false);
      qc.invalidateQueries({ queryKey: ['arrangement-evidence', id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const decide = useMutation({
    mutationFn: (v: { findingId: string; decision: 'approve' | 'reject' | 'reset' }) =>
      arrangementsApi.decideFinding(id, v.findingId, v.decision),
    onSuccess: () => {
      toast.success('Decision recorded');
      qc.invalidateQueries({ queryKey: ['findings', id] });
    },
    onError: (e) => {
      const msg = getErrorMessage(e);
      toast.error(msg.includes('permission') ? 'A checker role is required to decide findings' : msg);
    },
  });

  if (isLoading) return <div className="page-container max-w-5xl mx-auto space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  if (!arrangement) return <div className="page-container max-w-5xl mx-auto">Arrangement not found.</div>;

  return (
    <div className="page-container max-w-5xl mx-auto">
      <button onClick={() => router.push('/arrangements')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Arrangements
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{arrangement.providerName} · {arrangement.businessFunctionName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{arrangement.legalEntityName}</p>
        </div>
        <Button
          size="sm"
          onClick={() => assess.mutate()}
          disabled={assess.isPending || (assessing && findings.length === 0)}
        >
          <Play className="h-4 w-4 mr-2" />
          {assessing && findings.length === 0 ? 'Assessing…' : 'Run assessment'}
        </Button>
      </div>

      {/* Dimensions */}
      <div className="rounded-lg border p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label="Type" value={<ArrangementTypeBadge value={arrangement.arrangementType} />} />
        <Field label="Criticality" value={<CriticalityBadge value={arrangement.criticality} />} />
        <Field label="ICT service" value={arrangement.ictServiceName} />
        <Field label="Data residency" value={arrangement.dataResidency || '—'} />
        <Field label="Dependency" value={arrangement.dependency ?? '—'} />
        <Field label="Exit difficulty" value={arrangement.exitDifficulty ?? '—'} />
        <Field label="Data classes" value={arrangement.dataClasses?.length ? arrangement.dataClasses.join(', ') : '—'} />
        <Field label="CIF" value={arrangement.criticalOrImportant ? <Badge variant="destructive" className="text-xs">Yes</Badge> : 'No'} />
      </div>

      {/* Evidence */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold flex items-center gap-1.5"><FileText className="h-4 w-4" /> Evidence ({evidence.length})</h2>
          <Button size="sm" variant="outline" onClick={() => setEvOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Attach</Button>
        </div>
        {evidence.length === 0 ? (
          <p className="text-sm text-muted-foreground">No evidence attached. Without evidence, every control is <em>insufficient evidence</em> (human review) — never a false pass.</p>
        ) : (
          <div className="rounded-md border divide-y">
            {evidence.map((e) => (
              <div key={e.id} className="px-3 py-2 text-sm flex items-center justify-between">
                <span className="font-medium">{e.document}</span>
                <span className="text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px] mr-2">{e.scope === 'provider' ? 'provider-global' : 'arrangement'}</Badge>
                  {e.source || '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Findings */}
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-1.5 mb-2"><ShieldCheck className="h-4 w-4" /> Findings ({findings.length})</h2>
        {findings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No findings yet — run an assessment to generate evidence-grounded, cited verdicts.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-6"></TableHead>
                  <TableHead>Control</TableHead>
                  <TableHead>Verdict</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {findings.map((f) => (
                  <Fragment key={f.id}>
                    <TableRow className="cursor-pointer" onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}>
                      <TableCell>
                        <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expandedId === f.id ? 'rotate-90' : ''}`} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{f.controlId}</TableCell>
                      <TableCell><VerdictBadge verdict={f.verdict} /></TableCell>
                      <TableCell className="text-xs tabular-nums">{f.confidence != null ? `${Math.round(f.confidence * 100)}%` : '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={f.status === 'approved' ? 'default' : f.status === 'rejected' ? 'destructive' : 'outline'}
                          className={`text-[10px] ${f.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100' : ''}`}
                        >
                          {f.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {f.status === 'draft' ? (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600" disabled={decide.isPending} onClick={() => decide.mutate({ findingId: f.id, decision: 'approve' })}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" disabled={decide.isPending} onClick={() => decide.mutate({ findingId: f.id, decision: 'reject' })}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" disabled={decide.isPending} onClick={() => decide.mutate({ findingId: f.id, decision: 'reset' })}>
                            reopen
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedId === f.id && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell />
                        <TableCell colSpan={5} className="text-xs space-y-2 py-3">
                          <p className="text-muted-foreground">{f.rationale || 'No rationale recorded.'}</p>
                          {f.citations?.length > 0 ? (
                            <div className="space-y-1">
                              <p className="font-medium">Cited evidence:</p>
                              {f.citations.map((c, i) => (
                                <div key={i} className="rounded bg-background border px-2 py-1">
                                  <span className="text-muted-foreground">{c.source}</span> — {c.snippet}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground italic">No evidence cited — control library {f.libraryVersion}.</p>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={evOpen} onOpenChange={setEvOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Attach evidence</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-dashed p-3">
              <Label className="text-xs text-muted-foreground">Upload a document (indexed so verdicts cite real text)</Label>
              <input
                type="file"
                accept=".pdf,.docx,.xlsx"
                disabled={ingest.isPending}
                className="mt-1.5 block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-primary-foreground"
                onChange={(e) => e.target.files?.[0] && ingest.mutate(e.target.files[0])}
              />
              {ingest.isPending && <p className="text-xs text-muted-foreground mt-1">Indexing…</p>}
            </div>
            <p className="text-xs text-center text-muted-foreground">— or record metadata only —</p>
            <div className="space-y-1.5">
              <Label>Document *</Label>
              <Input placeholder="e.g. ISO 27001 certificate" value={doc} onChange={(e) => setDoc(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Input placeholder="e.g. Provider Trust Center" value={src} onChange={(e) => setSrc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvOpen(false)}>Cancel</Button>
            <Button disabled={!doc.trim() || attach.isPending} onClick={() => attach.mutate()}>Attach</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
