'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Network, AlertTriangle, Layers, GitBranch, Plus, Trash2, Check, ScanSearch } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getErrorMessage } from '@/lib/api/client';
import {
  concentrationApi,
  type FunctionCriticality,
} from '@/features/concentration/api/concentration';
import {
  useConcentrationAnalysisQuery,
  useConcentrationGraphQuery,
  useCriticalFunctionsQuery,
  useDependenciesQuery,
} from '@/features/concentration/queries/use-concentration-query';
import { ConcentrationGraph } from './concentration-graph';

function Kpi({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums mt-1">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </Card>
  );
}

export function ConcentrationPage() {
  const qc = useQueryClient();
  const { data: analysis, isLoading } = useConcentrationAnalysisQuery();
  const { data: graph } = useConcentrationGraphQuery();
  const { data: functions = [] } = useCriticalFunctionsQuery();
  const { data: dependencies = [] } = useDependenciesQuery();

  const invalidateAll = () =>
    qc.invalidateQueries({ queryKey: ['concentration'] });

  const confirmDep = useMutation({
    mutationFn: (v: { id: string; confirmed: boolean }) =>
      concentrationApi.confirmDependency(v.id, v.confirmed),
    onSuccess: () => {
      toast.success('Dependency updated');
      invalidateAll();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // ── AI sub-provider extraction (RTV-72) ─────────────────────────────────────
  // Scans a vendor's indexed documents and proposes UNCONFIRMED nth-party edges,
  // which then flow into the confirm table below (propose → human confirms).
  const [extractOpen, setExtractOpen] = useState(false);
  const [extractWs, setExtractWs] = useState('');
  const extractDeps = useMutation({
    mutationFn: (workspaceId: string) => concentrationApi.extractSubProviders(workspaceId),
    onSuccess: (res) => {
      const created = res.data?.created ?? 0;
      if (created > 0) {
        toast.success(`${created} sub-provider edge(s) proposed — review and confirm below`);
      } else {
        const hadCandidates = (res.data?.candidates?.length ?? 0) > 0;
        toast.info(
          hadCandidates
            ? 'No new sub-providers — everything found is already mapped'
            : 'No sub-providers found (this vendor has no indexed documents yet)'
        );
      }
      setExtractOpen(false);
      setExtractWs('');
      invalidateAll();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // ── critical-function create ──────────────────────────────────────────────────
  const [cfOpen, setCfOpen] = useState(false);
  const [name, setName] = useState('');
  const [criticality, setCriticality] = useState<FunctionCriticality>('critical');
  const [description, setDescription] = useState('');
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  // provider choices from the graph (id `w:<wsId>`); dependsOn stores the bare workspace id.
  const providerChoices = (graph?.nodes ?? [])
    .filter((n) => n.type === 'provider')
    .map((n) => ({ id: n.id.replace(/^w:/, ''), label: n.label }));

  const resetCf = () => {
    setName('');
    setCriticality('critical');
    setDescription('');
    setDependsOn([]);
    setCfOpen(false);
  };
  const saveCf = useMutation({
    mutationFn: () =>
      concentrationApi.saveFunction({ name: name.trim(), criticality, description: description.trim(), dependsOn }),
    onSuccess: () => {
      toast.success('Critical function saved');
      resetCf();
      invalidateAll();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const deleteCf = useMutation({
    mutationFn: (id: string) => concentrationApi.deleteFunction(id),
    onSuccess: () => {
      toast.success('Critical function deleted');
      invalidateAll();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading) {
    return (
      <div className="page-container max-w-6xl mx-auto space-y-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  const cov = analysis?.coverage;
  const providerConcentration = analysis?.providerConcentration ?? [];
  const sharedSubstrate = analysis?.sharedSubstrate ?? [];
  const spofs = analysis?.singlePointsOfFailure ?? [];

  return (
    <div className="page-container max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2"><Network className="h-5 w-5" /> Concentration &amp; nth-party graph</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Firm-wide ICT concentration and sub-provider dependencies (DORA Art. 29). Spans every provider —
          not scoped to one vendor.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi label="Providers" value={cov?.totalProviders ?? 0} />
        <Kpi label="Critical functions" value={cov?.criticalFunctionCount ?? 0} />
        <Kpi label="Single points of failure" value={spofs.length} hint="CIF on a sole provider" />
        <Kpi label="Shared substrate" value={sharedSubstrate.length} hint="reached by ≥2 providers" />
        <Kpi
          label="Provider coverage"
          value={`${cov?.providersMappedToFunctions ?? 0}/${cov?.totalProviders ?? 0}`}
          hint="mapped to a function"
        />
      </div>

      {/* Graph */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold flex items-center gap-1.5 mb-3"><GitBranch className="h-4 w-4" /> Dependency graph</h2>
        {graph && graph.nodes.length > 0 ? (
          <ConcentrationGraph nodes={graph.nodes} edges={graph.edges} />
        ) : (
          <p className="text-sm text-muted-foreground">
            No graph yet — add critical functions and map their providers, then confirm nth-party edges.
          </p>
        )}
      </Card>

      {/* SPOF + shared substrate */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-1.5 mb-2"><AlertTriangle className="h-4 w-4" /> Single points of failure ({spofs.length})</h2>
          {spofs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No CIF depends on a single provider.</p>
          ) : (
            <div className="rounded-md border divide-y">
              {spofs.map((s) => (
                <div key={s.functionId} className="px-3 py-2 text-sm flex items-center justify-between gap-2">
                  <span className="font-medium">{s.functionName}</span>
                  <span className="text-xs text-muted-foreground">sole provider: <span className="text-foreground">{s.soleProvider}</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-1.5 mb-2"><Layers className="h-4 w-4" /> Shared substrate ({sharedSubstrate.length})</h2>
          {sharedSubstrate.length === 0 ? (
            <p className="text-sm text-muted-foreground">No node is reached by two or more providers.</p>
          ) : (
            <div className="rounded-md border divide-y">
              {sharedSubstrate.map((n) => (
                <div key={n.key} className="px-3 py-2 text-sm flex items-center justify-between gap-2">
                  <span className="font-medium">{n.name}</span>
                  <Badge variant="outline" className="text-[10px]">{n.reachedByProviderCount} providers</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Provider concentration ranking */}
      <div>
        <h2 className="text-sm font-semibold mb-2">Provider concentration</h2>
        {providerConcentration.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assessed provider supports a mapped critical function yet.</p>
        ) : (
          <div className="rounded-md border divide-y">
            {providerConcentration.map((p) => (
              <div key={p.key} className="px-3 py-2 text-sm flex items-center justify-between gap-2">
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {p.supportedFunctions} function(s) · weighted {p.weightedScore}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* nth-party dependencies + confirm */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">nth-party dependencies ({dependencies.length})</h2>
          <Button
            size="sm"
            variant="outline"
            disabled={providerChoices.length === 0}
            title={providerChoices.length === 0 ? 'Add vendors first' : 'Extract sub-providers from a vendor’s documents'}
            onClick={() => setExtractOpen(true)}
          >
            <ScanSearch className="h-3.5 w-3.5 mr-1" /> Scan vendor docs
          </Button>
        </div>
        {dependencies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sub-provider edges yet.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Sub-provider</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dependencies.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-sm">{d.parent?.name}</TableCell>
                    <TableCell className="text-sm">{d.child?.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.source ?? '—'}</TableCell>
                    <TableCell>
                      {d.confirmed ? (
                        <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 border-green-200">confirmed</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">unconfirmed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {d.confirmed ? (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" disabled={confirmDep.isPending} onClick={() => confirmDep.mutate({ id: d.id, confirmed: false })}>
                          unconfirm
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600" disabled={confirmDep.isPending} onClick={() => confirmDep.mutate({ id: d.id, confirmed: true })}>
                          <Check className="h-3.5 w-3.5 mr-1" /> Confirm
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Critical functions (firm-owned governance) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Critical functions ({functions.length})</h2>
          <Button size="sm" variant="outline" onClick={() => setCfOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
        </div>
        {functions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No critical functions defined. Add one and map the providers it depends on.</p>
        ) : (
          <div className="rounded-md border divide-y">
            {functions.map((f) => (
              <div key={f.id} className="px-3 py-2 text-sm flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{f.name}</span>
                  <Badge variant={f.criticality === 'critical' ? 'destructive' : 'outline'} className="text-[10px] capitalize">{f.criticality}</Badge>
                  <span className="text-xs text-muted-foreground">{f.dependsOn?.length ?? 0} provider(s)</span>
                </div>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" disabled={deleteCf.isPending} onClick={() => deleteCf.mutate(f.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Extract sub-providers dialog (RTV-72) */}
      <Dialog open={extractOpen} onOpenChange={(o) => { setExtractOpen(o); if (!o) setExtractWs(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Scan a vendor&apos;s documents for sub-providers</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Retrieva reads the vendor&apos;s indexed evidence (SOC&nbsp;2, contracts, sub-processor lists) and
              proposes nth-party dependency edges. Proposed edges are <strong>unconfirmed</strong> and do not
              affect concentration scoring until you confirm them in the table.
            </p>
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              {providerChoices.length === 0 ? (
                <p className="text-xs text-muted-foreground">No vendors yet.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
                  {providerChoices.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="extract-vendor"
                        checked={extractWs === p.id}
                        onChange={() => setExtractWs(p.id)}
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setExtractOpen(false); setExtractWs(''); }}>Cancel</Button>
            <Button disabled={!extractWs || extractDeps.isPending} onClick={() => extractDeps.mutate(extractWs)}>
              {extractDeps.isPending ? 'Scanning…' : 'Extract'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add critical function dialog */}
      <Dialog open={cfOpen} onOpenChange={(o) => (o ? setCfOpen(true) : resetCf())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add critical function</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="e.g. Claims processing" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Criticality</Label>
              <div className="flex gap-2">
                {(['critical', 'important'] as FunctionCriticality[]).map((c) => (
                  <Button key={c} type="button" size="sm" variant={criticality === c ? 'default' : 'outline'} className="capitalize" onClick={() => setCriticality(c)}>
                    {c}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} placeholder="Optional" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Depends on providers</Label>
              {providerChoices.length === 0 ? (
                <p className="text-xs text-muted-foreground">No providers yet — add vendors first.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
                  {providerChoices.map((p) => {
                    const checked = dependsOn.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setDependsOn((prev) => (checked ? prev.filter((x) => x !== p.id) : [...prev, p.id]))
                          }
                        />
                        {p.label}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetCf}>Cancel</Button>
            <Button disabled={!name.trim() || saveCf.isPending} onClick={() => saveCf.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
