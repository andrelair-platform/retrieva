'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

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
  type ArrangementType,
  type Criticality,
  type Level,
} from '@/features/arrangements/api/arrangements';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NONE = '__none__';

export function ArrangementForm({ open, onOpenChange }: Props) {
  const qc = useQueryClient();

  const [legalEntityId, setLegalEntityId] = useState('');
  const [businessFunctionId, setBusinessFunctionId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [ictServiceId, setIctServiceId] = useState('');
  const [arrangementType, setArrangementType] = useState<ArrangementType>('external');
  const [criticality, setCriticality] = useState<Criticality | ''>('');
  const [dependency, setDependency] = useState<Level | ''>('');
  const [exitDifficulty, setExitDifficulty] = useState<Level | ''>('');
  const [dataClasses, setDataClasses] = useState('');
  const [dataResidency, setDataResidency] = useState('');

  // quick-create inline state
  const [newEntity, setNewEntity] = useState('');
  const [newFn, setNewFn] = useState('');
  const [newFnCif, setNewFnCif] = useState(false);
  const [newProvider, setNewProvider] = useState('');

  const entities = useQuery({
    queryKey: ['legal-entities'],
    queryFn: async () => (await arrangementsApi.listLegalEntities()).data?.legalEntities ?? [],
    enabled: open,
  });
  const functions = useQuery({
    queryKey: ['business-functions', legalEntityId],
    queryFn: async () => (await arrangementsApi.listBusinessFunctions(legalEntityId)).data?.businessFunctions ?? [],
    enabled: open && !!legalEntityId,
  });
  const providers = useQuery({
    queryKey: ['providers'],
    queryFn: async () => (await arrangementsApi.listProviders()).data?.providers ?? [],
    enabled: open,
  });
  const services = useQuery({
    queryKey: ['ict-services', providerId],
    queryFn: async () => (await arrangementsApi.listIctServices(providerId)).data?.ictServices ?? [],
    enabled: open && !!providerId,
  });

  const createEntity = useMutation({
    mutationFn: () => arrangementsApi.createLegalEntity({ name: newEntity.trim() }),
    onSuccess: (res) => {
      const e = res.data?.legalEntity;
      setNewEntity('');
      qc.invalidateQueries({ queryKey: ['legal-entities'] });
      if (e) setLegalEntityId(e.id);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const createFn = useMutation({
    mutationFn: () =>
      arrangementsApi.createBusinessFunction({
        name: newFn.trim(),
        legalEntityId,
        criticalOrImportant: newFnCif,
      }),
    onSuccess: (res) => {
      const f = res.data?.businessFunction;
      setNewFn('');
      setNewFnCif(false);
      qc.invalidateQueries({ queryKey: ['business-functions', legalEntityId] });
      if (f) setBusinessFunctionId(f.id);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const createProvider = useMutation({
    mutationFn: () => arrangementsApi.createProvider({ name: newProvider.trim() }),
    onSuccess: (res) => {
      const p = res.data?.provider;
      setNewProvider('');
      qc.invalidateQueries({ queryKey: ['providers'] });
      if (p) setProviderId(p.id);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const submit = useMutation({
    mutationFn: () =>
      arrangementsApi.create({
        legalEntityId,
        businessFunctionId,
        providerId,
        ictServiceId: ictServiceId || null,
        arrangementType,
        criticality: criticality || null,
        dependency: dependency || null,
        exitDifficulty: exitDifficulty || null,
        dataResidency,
        dataClasses: dataClasses
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      toast.success('Arrangement created');
      qc.invalidateQueries({ queryKey: ['arrangements'] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const canSubmit = legalEntityId && businessFunctionId && providerId && !submit.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New ICT arrangement</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Legal entity */}
          <div className="space-y-1.5">
            <Label>Legal entity *</Label>
            <Select value={legalEntityId} onValueChange={setLegalEntityId}>
              <SelectTrigger><SelectValue placeholder="Select a legal entity" /></SelectTrigger>
              <SelectContent>
                {(entities.data ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input placeholder="…or create one" value={newEntity} onChange={(e) => setNewEntity(e.target.value)} className="h-8 text-sm" />
              <Button type="button" size="sm" variant="outline" disabled={!newEntity.trim() || createEntity.isPending} onClick={() => createEntity.mutate()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Business function */}
          <div className="space-y-1.5">
            <Label>Business function *</Label>
            <Select value={businessFunctionId} onValueChange={setBusinessFunctionId} disabled={!legalEntityId}>
              <SelectTrigger><SelectValue placeholder={legalEntityId ? 'Select a function' : 'Pick an entity first'} /></SelectTrigger>
              <SelectContent>
                {(functions.data ?? []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}{f.criticalOrImportant ? ' • CIF' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {legalEntityId && (
              <div className="flex items-center gap-2">
                <Input placeholder="…or create one" value={newFn} onChange={(e) => setNewFn(e.target.value)} className="h-8 text-sm" />
                <div className="flex items-center gap-1.5 shrink-0">
                  <Switch checked={newFnCif} onCheckedChange={setNewFnCif} id="cif" />
                  <Label htmlFor="cif" className="text-xs text-muted-foreground">CIF</Label>
                </div>
                <Button type="button" size="sm" variant="outline" disabled={!newFn.trim() || createFn.isPending} onClick={() => createFn.mutate()}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Provider */}
          <div className="space-y-1.5">
            <Label>ICT provider *</Label>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger><SelectValue placeholder="Select a provider" /></SelectTrigger>
              <SelectContent>
                {(providers.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input placeholder="…or create one" value={newProvider} onChange={(e) => setNewProvider(e.target.value)} className="h-8 text-sm" />
              <Button type="button" size="sm" variant="outline" disabled={!newProvider.trim() || createProvider.isPending} onClick={() => createProvider.mutate()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* ICT service (optional) */}
          {providerId && (services.data ?? []).length > 0 && (
            <div className="space-y-1.5">
              <Label>ICT service</Label>
              <Select value={ictServiceId} onValueChange={setIctServiceId}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {(services.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Attributes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={arrangementType} onValueChange={(v) => setArrangementType(v as ArrangementType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="external">External</SelectItem>
                  <SelectItem value="intra_group">Intra-group</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Criticality</Label>
              <Select value={criticality || NONE} onValueChange={(v) => setCriticality(v === NONE ? '' : (v as Criticality))}>
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
              <Label>Dependency</Label>
              <Select value={dependency || NONE} onValueChange={(v) => setDependency(v === NONE ? '' : (v as Level))}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Exit difficulty</Label>
              <Select value={exitDifficulty || NONE} onValueChange={(v) => setExitDifficulty(v === NONE ? '' : (v as Level))}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data residency</Label>
              <Input placeholder="e.g. FR" value={dataResidency} onChange={(e) => setDataResidency(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data classes</Label>
              <Input placeholder="pii, claims" value={dataClasses} onChange={(e) => setDataClasses(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!canSubmit} onClick={() => submit.mutate()}>
            {submit.isPending ? 'Creating…' : 'Create arrangement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
