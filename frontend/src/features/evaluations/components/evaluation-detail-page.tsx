'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trophy, Sparkles, UserCog, ArrowLeft, CheckCircle2, AlertTriangle, Globe } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getErrorMessage } from '@/shared/api/client';
import {
  useEvaluationQuery,
  useAddCandidate,
  useSetManualScores,
  useSelectWinner,
  useVendorResearch,
} from '@/features/evaluations/queries/use-evaluations';
import {
  MANUAL_LANES,
  LANE_LABEL,
  type EvaluationCandidate,
  type ScoredCandidate,
  type VendorResearchResult,
} from '@/features/evaluations/api/evaluations';

const hasSubcontractors = (subs: unknown): boolean => Array.isArray(subs) && subs.length > 0;

// Research failures are usually the egress gate being off → a friendlier message for that case.
const researchErrorMessage = (msg: string): string =>
  /disabled/i.test(msg) ? 'Web research is turned off for this environment' : msg;

// Formatters for the researched-vendor preview block.
const researchedSubprocessors = (r: VendorResearchResult): string =>
  r.proposal.subcontractors?.length ? r.proposal.subcontractors.join(', ') : '— none evidenced';
const researchedResidency = (r: VendorResearchResult): string =>
  r.proposal.dataResidency || '— not stated';

// Per-candidate derived view used by the ranked list render (keeps the map callback branch-free).
function candidateView(
  c: EvaluationCandidate,
  r: { rank: number; scored: ScoredCandidate } | undefined
) {
  const scoreTotal = r?.scored.total ?? 0;
  const isSelected = c.status === 'selected';
  return {
    rank: r?.rank,
    isLeader: r?.rank === 1 && scoreTotal > 0,
    scoreTotal,
    completeness: r?.scored.completeness ?? 0,
    needsVendorEvidence: !hasSubcontractors(c.proposal?.subcontractors),
    isSelected,
    isRejected: c.status === 'rejected',
    cardClass: isSelected ? 'border-green-300' : '',
  };
}

// Per-candidate control flags (keeps the ||/? branches out of the ranked-list render callback).
function candidateControls(args: {
  savePending: boolean;
  hasEdits: boolean;
  needsEntity: boolean;
  selectPending: boolean;
}) {
  return {
    saveDisabled: args.savePending || !args.hasEdits,
    selectDisabled: args.needsEntity || args.selectPending,
    selectTitle: args.needsEntity ? 'Set the legal entity first' : 'Select as the winner',
  };
}

// The "add a candidate vendor" dialog. A plain render helper (not a component) so the rendered tree
// is identical to inlining it — it keeps the component body's branch count down.
function renderAddCandidateDialog(args: {
  open: boolean;
  setOpen: (o: boolean) => void;
  resetAdd: () => void;
  vendorName: string;
  setVendorName: (v: string) => void;
  setDoc: (f: File | null) => void;
  researchUrl: string;
  setResearchUrl: (v: string) => void;
  researchPending: boolean;
  researched: VendorResearchResult | null;
  runResearch: () => void;
  addPending: boolean;
  addVendor: () => void;
}): React.ReactNode {
  const {
    open,
    setOpen,
    resetAdd,
    vendorName,
    setVendorName,
    setDoc,
    researchUrl,
    setResearchUrl,
    researchPending,
    researched,
    runResearch,
    addPending,
    addVendor,
  } = args;
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetAdd(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a candidate vendor</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cand-vendor">Vendor *</Label>
            <Input
              id="cand-vendor"
              placeholder="e.g. Notion"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cand-doc">Vendor documents (optional)</Label>
            <Input
              id="cand-doc"
              type="file"
              accept=".pdf,.docx,.xlsx"
              onChange={(e) => setDoc(e.target.files?.[0] ?? null)}
            />
            <p className="text-[11px] text-muted-foreground">
              SOC 2 / DPA / sub-processor list — grounds the vendor facts. Anything not evidenced stays flagged, never guessed.
            </p>
          </div>

          {/* E5 — research the vendor's public trust page (egress-gated; disabled → a toast) */}
          <div className="space-y-1.5 rounded-md border border-dashed p-2.5">
            <Label htmlFor="cand-url" className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> …or fetch from the web (optional)
            </Label>
            <div className="flex gap-2">
              <Input
                id="cand-url"
                placeholder="https://trust.notion.so/…"
                value={researchUrl}
                onChange={(e) => setResearchUrl(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!vendorName.trim() || !researchUrl.trim() || researchPending}
                onClick={runResearch}
              >
                {researchPending ? 'Fetching…' : 'Research'}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Fetches the vendor&apos;s own trust-centre / sub-processor page (allow-listed domains only).
              Facts are shown with their source for you to verify — never auto-applied.
            </p>
            {researched && (
              <div className="mt-1 rounded bg-muted/50 p-2 text-[11px]">
                <p className="text-muted-foreground">
                  From <span className="text-foreground">{researched.provenance.host}</span>:
                </p>
                <p className="mt-0.5">
                  Sub-processors:{' '}
                  <span className="text-foreground">{researchedSubprocessors(researched)}</span>
                </p>
                <p>
                  Data residency:{' '}
                  <span className="text-foreground">{researchedResidency(researched)}</span>
                </p>
                {researched.gaps.length > 0 && (
                  <p className="mt-0.5 text-amber-600">Still missing: {researched.gaps.join(', ')}</p>
                )}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetAdd}>
            Cancel
          </Button>
          <Button disabled={!vendorName.trim() || addPending} onClick={addVendor}>
            {addPending ? 'Drafting…' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScoreChip({ label, value }: { label: string; value: number | null | undefined }) {
  const v = typeof value === 'number' ? value : null;
  const tone =
    v === null ? 'bg-muted text-muted-foreground' : v >= 70 ? 'bg-green-100 text-green-700' : v >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] ${tone}`}>
      {label} <span className="font-semibold tabular-nums">{v === null ? '—' : v}</span>
    </span>
  );
}

export function EvaluationDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { data, isLoading } = useEvaluationQuery(id);
  const addCandidate = useAddCandidate(id);
  const setScores = useSetManualScores(id);
  const selectWinner = useSelectWinner(id);
  const research = useVendorResearch();

  const [open, setOpen] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [doc, setDoc] = useState<File | null>(null);
  const [researchUrl, setResearchUrl] = useState('');
  const [researched, setResearched] = useState<VendorResearchResult | null>(null);
  // local manual-score edits keyed by candidateId → { lane: value }
  const [edits, setEdits] = useState<Record<string, Record<string, number>>>({});

  if (isLoading) {
    return (
      <div className="page-container mx-auto max-w-5xl space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
      </div>
    );
  }
  if (!data) {
    return <div className="page-container mx-auto max-w-5xl py-10 text-sm text-muted-foreground">Evaluation not found.</div>;
  }

  const { evaluation, candidates, ranking } = data;
  const rankById = new Map<string, { rank: number; scored: ScoredCandidate }>(
    ranking.map((r, i) => [r.candidateId, { rank: i + 1, scored: r }])
  );
  const onboarded = evaluation.status === 'onboarded';
  const needsEntity = !evaluation.legalEntityId;

  const resetAdd = () => {
    setVendorName('');
    setDoc(null);
    setResearchUrl('');
    setResearched(null);
    setOpen(false);
  };

  const addVendor = () =>
    addCandidate.mutate(
      { vendorName: vendorName.trim(), doc },
      {
        onSuccess: () => {
          toast.success('Candidate drafted — Retrieva scored the DORA/security lane');
          resetAdd();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );

  // E5 — fetch the vendor's public trust page (egress-gated; 403 → disabled). Preview only: the
  // provenanced facts are shown for the human; nothing is persisted until the candidate is added.
  const runResearch = () =>
    research.mutate(
      { vendorName: vendorName.trim(), sourceUrl: researchUrl.trim() },
      {
        onSuccess: (res) => {
          setResearched(res.data ?? null);
          toast.success('Fetched the vendor page — review the provenanced facts below');
        },
        onError: (e) => {
          toast.error(researchErrorMessage(getErrorMessage(e)));
        },
      }
    );

  const saveScores = (candidateId: string) =>
    setScores.mutate(
      { candidateId, manualScores: edits[candidateId] ?? {} },
      {
        onSuccess: () => toast.success('Scores saved'),
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );

  const select = (c: EvaluationCandidate) =>
    selectWinner.mutate(c.id, {
      onSuccess: (res) => {
        toast.success(`${c.vendorName} selected — promoted to an arrangement for due diligence`);
        const arrId = res.data?.arrangement?.id;
        if (arrId) router.push(`/arrangements/${arrId}`);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });

  return (
    <div className="page-container mx-auto max-w-5xl space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => router.push('/evaluations')}>
        <ArrowLeft className="mr-1 h-4 w-4" /> All evaluations
      </Button>

      <PageHeader
        icon={Trophy}
        title={evaluation.title}
        description={evaluation.need || 'Compare candidate vendors, then select the winner to start due diligence.'}
        actions={
          !onboarded && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add candidate
            </Button>
          )
        }
      />

      {onboarded && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4" /> A winner was selected and promoted to an arrangement.
        </div>
      )}
      {needsEntity && !onboarded && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4" /> Set this evaluation’s legal entity before selecting a winner.
        </div>
      )}

      {/* lane legend — the honesty line: auto vs buyer-owned */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-primary" /> Retrieva-scored (DORA · security · concentration)</span>
        <span className="inline-flex items-center gap-1"><UserCog className="h-3.5 w-3.5" /> Your call (functional · ease of use · cost)</span>
      </div>

      {candidates.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No candidates yet. Add 2–3 vendors to compare.
        </div>
      ) : (
        <div className="space-y-4">
          {candidates
            .slice()
            .sort((a, b) => (rankById.get(a.id)?.rank ?? 99) - (rankById.get(b.id)?.rank ?? 99))
            .map((c) => {
              const r = rankById.get(c.id);
              const {
                isLeader,
                scoreTotal,
                completeness,
                needsVendorEvidence,
                isSelected,
                isRejected,
                cardClass,
              } = candidateView(c, r);
              const { saveDisabled, selectDisabled, selectTitle } = candidateControls({
                savePending: setScores.isPending,
                hasEdits: !!edits[c.id],
                needsEntity,
                selectPending: selectWinner.isPending,
              });
              return (
                <Card key={c.id} className={`p-4 ${cardClass}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {isLeader && <Trophy className="h-4 w-4 text-amber-500" aria-label="Top-ranked" />}
                      <span className="font-semibold">{c.vendorName}</span>
                      {isSelected && (
                        <Badge variant="outline" className="border-green-200 bg-green-100 text-[10px] text-green-700">selected</Badge>
                      )}
                      {isRejected && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">not chosen</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">
                        score <span className="font-semibold tabular-nums text-foreground">{scoreTotal}</span>/100
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {Math.round(completeness * 100)}% scored
                      </span>
                    </div>
                  </div>

                  {/* auto lane (read-only) */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <ScoreChip label="DORA" value={c.autoScores?.dora} />
                    <ScoreChip label="Security" value={c.autoScores?.security} />
                    <ScoreChip label="Concentration" value={c.autoScores?.concentration} />
                    {needsVendorEvidence && (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700">
                        <AlertTriangle className="h-3 w-3" /> needs vendor evidence
                      </span>
                    )}
                  </div>

                  {/* manual lane (editable) */}
                  {!onboarded && (
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
                      {MANUAL_LANES.map((lane) => (
                        <div key={lane} className="space-y-1">
                          <Label htmlFor={`${c.id}-${lane}`} className="text-[11px] text-muted-foreground">
                            {LANE_LABEL[lane]}
                          </Label>
                          <Input
                            id={`${c.id}-${lane}`}
                            type="number"
                            min={0}
                            max={100}
                            className="h-8"
                            defaultValue={(c.manualScores?.[lane] as number | undefined) ?? ''}
                            onChange={(e) =>
                              setEdits((prev) => ({
                                ...prev,
                                [c.id]: { ...prev[c.id], [lane]: Number(e.target.value) },
                              }))
                            }
                          />
                        </div>
                      ))}
                      <div className="flex items-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-full"
                          disabled={saveDisabled}
                          onClick={() => saveScores(c.id)}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  )}

                  {!onboarded && (
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        disabled={selectDisabled}
                        title={selectTitle}
                        onClick={() => select(c)}
                      >
                        <Trophy className="mr-1.5 h-3.5 w-3.5" /> Select winner
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
        </div>
      )}

      {/* add candidate */}
      {renderAddCandidateDialog({
        open,
        setOpen,
        resetAdd,
        vendorName,
        setVendorName,
        setDoc,
        researchUrl,
        setResearchUrl,
        researchPending: research.isPending,
        researched,
        runResearch,
        addPending: addCandidate.isPending,
        addVendor,
      })}
    </div>
  );
}
