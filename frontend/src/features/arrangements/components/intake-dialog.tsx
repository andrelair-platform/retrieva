'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UploadCloud, Sparkles, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getErrorMessage } from '@/lib/api/client';
import {
  arrangementsApi,
  type ArrangementProposal,
  type ArrangementType,
  type Criticality,
} from '@/features/arrangements/api/arrangements';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NONE = '__none__';

export function IntakeDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const [proposal, setProposal] = useState<ArrangementProposal | null>(null);
  const [source, setSource] = useState<string>('');
  const [confidence, setConfidence] = useState(0);
  const [file, setFile] = useState<File | null>(null);

  const set = <K extends keyof ArrangementProposal>(k: K, v: ArrangementProposal[K]) =>
    setProposal((p) => (p ? { ...p, [k]: v } : p));

  const extract = useMutation({
    mutationFn: (file: File) => arrangementsApi.intake(file),
    onSuccess: (res) => {
      const r = res.data;
      if (!r) return;
      setProposal(r.proposal);
      setSource(r.source.fileName);
      setConfidence(r.proposal.confidence);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const confirm = useMutation({
    mutationFn: () => arrangementsApi.confirmIntake(proposal as ArrangementProposal, source),
    onSuccess: async (res) => {
      toast.success('Arrangement created from contract');
      qc.invalidateQueries({ queryKey: ['arrangements'] });
      const id = res.data?.arrangement?.id;
      // Index the contract text so the assessment can cite real passages (best-effort).
      if (id && file) await arrangementsApi.ingestEvidence(id, file).catch(() => {});
      onOpenChange(false);
      reset();
      if (id) router.push(`/arrangements/${id}`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const reset = () => {
    setProposal(null);
    setSource('');
    setConfidence(0);
    setFile(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    onDrop: (files) => {
      if (files[0]) {
        setFile(files[0]);
        extract.mutate(files[0]);
      }
    },
    disabled: extract.isPending,
  });

  const close = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const canConfirm =
    proposal?.providerName && proposal?.legalEntityName && proposal?.businessFunctionName && !confirm.isPending;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Import from contract
          </DialogTitle>
        </DialogHeader>

        {!proposal ? (
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted'
            }`}
          >
            <input {...getInputProps()} />
            {extract.isPending ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Reading the contract & extracting the arrangement…</p>
              </>
            ) : (
              <>
                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Drop a contract, or click to choose</p>
                <p className="text-xs text-muted-foreground">PDF, DOCX or XLSX — the AI proposes an arrangement you review.</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-muted-foreground">
                Extracted from <span className="font-medium">{source}</span> — review & edit, then confirm.
              </span>
              <Badge variant="secondary" className="ml-auto text-[10px]">{Math.round(confidence * 100)}% conf.</Badge>
            </div>
            {proposal.notes && <p className="text-xs text-amber-600">⚠ {proposal.notes}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Provider *</Label>
                <Input value={proposal.providerName ?? ''} onChange={(e) => set('providerName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Legal entity *</Label>
                <Input value={proposal.legalEntityName ?? ''} onChange={(e) => set('legalEntityName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Business function *</Label>
                <Input value={proposal.businessFunctionName ?? ''} onChange={(e) => set('businessFunctionName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>ICT service</Label>
                <Input value={proposal.ictServiceName ?? ''} onChange={(e) => set('ictServiceName', e.target.value)} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={proposal.criticalOrImportant === true} onCheckedChange={(v) => set('criticalOrImportant', v)} id="cif2" />
                <Label htmlFor="cif2" className="text-xs text-muted-foreground">Critical/important function</Label>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Subcontractors (nth-party)</Label>
                <Input
                  value={proposal.subcontractors.join(', ')}
                  onChange={(e) => set('subcontractors', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                  placeholder="comma-separated"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={proposal.arrangementType ?? 'external'} onValueChange={(v) => set('arrangementType', v as ArrangementType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="external">External</SelectItem>
                    <SelectItem value="intra_group">Intra-group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Criticality</Label>
                <Select value={proposal.criticality ?? NONE} onValueChange={(v) => set('criticality', v === NONE ? null : (v as Criticality))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data residency</Label>
                <Input value={proposal.dataResidency ?? ''} onChange={(e) => set('dataResidency', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Data classes</Label>
                <Input
                  value={proposal.dataClasses.join(', ')}
                  onChange={(e) => set('dataClasses', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>Cancel</Button>
          {proposal && (
            <Button disabled={!canConfirm} onClick={() => confirm.mutate()}>
              {confirm.isPending ? 'Creating…' : 'Confirm & create'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
