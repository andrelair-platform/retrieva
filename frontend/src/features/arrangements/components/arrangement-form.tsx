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
import { getErrorMessage } from '@/shared/api/client';
import {
  arrangementsApi,
  type ArrangementType,
  type Criticality,
  type Level,
  type Trigger,
} from '@/features/arrangements/api/arrangements';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NONE = '__none__';

interface CreateArrangementFields {
  legalEntityId: string;
  businessFunctionId: string;
  providerId: string;
  ictServiceId: string;
  arrangementType: ArrangementType;
  criticality: Criticality | '';
  dependency: Level | '';
  exitDifficulty: Level | '';
  dataClasses: string;
  dataResidency: string;
  trigger: Trigger;
  businessPurpose: string;
  expectedCost: string;
  expectedCostCurrency: string;
  requestedStartDate: string;
}

function buildCreatePayload(f: CreateArrangementFields) {
  const intake =
    f.trigger === 'new'
      ? {
          businessPurpose: f.businessPurpose.trim() || null,
          expectedCost: f.expectedCost.trim() || null,
          expectedCostCurrency: f.expectedCost.trim() ? f.expectedCostCurrency : null,
          requestedStartDate: f.requestedStartDate || null,
        }
      : {};
  return {
    legalEntityId: f.legalEntityId,
    businessFunctionId: f.businessFunctionId,
    providerId: f.providerId,
    ictServiceId: f.ictServiceId || null,
    arrangementType: f.arrangementType,
    criticality: f.criticality || null,
    dependency: f.dependency || null,
    exitDifficulty: f.exitDifficulty || null,
    dataResidency: f.dataResidency,
    trigger: f.trigger,
    dataClasses: f.dataClasses
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    // Workflow B intake — only meaningful for a new-provider prospect.
    ...intake,
  };
}

function deriveFormView(args: {
  legalEntityId: string;
  businessFunctionId: string;
  providerId: string;
  serviceCount: number;
  submitPending: boolean;
  criticality: Criticality | '';
  dependency: Level | '';
  exitDifficulty: Level | '';
}) {
  return {
    canSubmit:
      !!args.legalEntityId && !!args.businessFunctionId && !!args.providerId && !args.submitPending,
    showServiceSelect: !!args.providerId && args.serviceCount > 0,
    criticalityValue: args.criticality || NONE,
    dependencyValue: args.dependency || NONE,
    exitDifficultyValue: args.exitDifficulty || NONE,
    functionPlaceholder: args.legalEntityId ? 'Select a function' : 'Pick an entity first',
    submitLabel: args.submitPending ? 'Creating…' : 'Create arrangement',
  };
}

function useArrangementLookups(open: boolean, legalEntityId: string, providerId: string) {
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
  return {
    entityList: entities.data ?? [],
    functionList: functions.data ?? [],
    providerList: providers.data ?? [],
    serviceList: services.data ?? [],
  };
}

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
  const [trigger, setTrigger] = useState<Trigger>('existing');

  // Workflow B pre-contract intake — the business owner's need (only for a new provider).
  const [businessPurpose, setBusinessPurpose] = useState('');
  const [expectedCost, setExpectedCost] = useState('');
  const [expectedCostCurrency, setExpectedCostCurrency] = useState('EUR');
  const [requestedStartDate, setRequestedStartDate] = useState('');

  // quick-create inline state
  const [newEntity, setNewEntity] = useState('');
  const [newFn, setNewFn] = useState('');
  const [newFnCif, setNewFnCif] = useState(false);
  const [newProvider, setNewProvider] = useState('');

  const { entityList, functionList, providerList, serviceList } = useArrangementLookups(
    open,
    legalEntityId,
    providerId,
  );

  const createEntity = useMutation({
    mutationFn: () => arrangementsApi.createLegalEntity({ name: newEntity.trim() }),
    onSuccess: (res) => {
      const e = res.data?.legalEntity;
      setNewEntity('');
      void qc.invalidateQueries({ queryKey: ['legal-entities'] });
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
      void qc.invalidateQueries({ queryKey: ['business-functions', legalEntityId] });
      if (f) setBusinessFunctionId(f.id);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const createProvider = useMutation({
    mutationFn: () => arrangementsApi.createProvider({ name: newProvider.trim() }),
    onSuccess: (res) => {
      const p = res.data?.provider;
      setNewProvider('');
      void qc.invalidateQueries({ queryKey: ['providers'] });
      if (p) setProviderId(p.id);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const submit = useMutation({
    mutationFn: () =>
      arrangementsApi.create(
        buildCreatePayload({
          legalEntityId,
          businessFunctionId,
          providerId,
          ictServiceId,
          arrangementType,
          criticality,
          dependency,
          exitDifficulty,
          dataClasses,
          dataResidency,
          trigger,
          businessPurpose,
          expectedCost,
          expectedCostCurrency,
          requestedStartDate,
        }),
      ),
    onSuccess: () => {
      toast.success('Arrangement created');
      void qc.invalidateQueries({ queryKey: ['arrangements'] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const onCriticalityChange = (v: string) => setCriticality(v === NONE ? '' : (v as Criticality));
  const onDependencyChange = (v: string) => setDependency(v === NONE ? '' : (v as Level));
  const onExitDifficultyChange = (v: string) => setExitDifficulty(v === NONE ? '' : (v as Level));
  const {
    canSubmit,
    showServiceSelect,
    criticalityValue,
    dependencyValue,
    exitDifficultyValue,
    functionPlaceholder,
    submitLabel,
  } = deriveFormView({
    legalEntityId,
    businessFunctionId,
    providerId,
    serviceCount: serviceList.length,
    submitPending: submit.isPending,
    criticality,
    dependency,
    exitDifficulty,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New ICT arrangement</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Trigger (RTV-31) — a new provider enters onboarding (prospect); an existing arrangement
              is already active in the register. */}
          <div className="space-y-1.5">
            <Label>How does this arrangement enter?</Label>
            <Select value={trigger} onValueChange={(v) => setTrigger(v as Trigger)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New provider — start onboarding (due diligence)</SelectItem>
                <SelectItem value="existing">Existing arrangement — already active</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Workflow B intake (new provider only) — the business owner's pre-contract need. */}
          {trigger === 'new' && (
            <div className="space-y-3 rounded-md border border-dashed p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Pre-contract intake — the business need (optional but recommended)
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs">Purpose / business need</Label>
                <Input
                  placeholder="Why this provider is needed"
                  value={businessPurpose}
                  onChange={(e) => setBusinessPurpose(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Expected cost (annual)</Label>
                  <div className="flex gap-1.5">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={expectedCost}
                      onChange={(e) => setExpectedCost(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Select value={expectedCostCurrency} onValueChange={setExpectedCostCurrency}>
                      <SelectTrigger className="h-8 w-20 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Requested start date</Label>
                  <Input
                    type="date"
                    value={requestedStartDate}
                    onChange={(e) => setRequestedStartDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Legal entity */}
          <div className="space-y-1.5">
            <Label>Legal entity *</Label>
            <Select value={legalEntityId} onValueChange={setLegalEntityId}>
              <SelectTrigger><SelectValue placeholder="Select a legal entity" /></SelectTrigger>
              <SelectContent>
                {entityList.map((e) => (
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
              <SelectTrigger><SelectValue placeholder={functionPlaceholder} /></SelectTrigger>
              <SelectContent>
                {functionList.map((f) => (
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
                {providerList.map((p) => (
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
          {showServiceSelect && (
            <div className="space-y-1.5">
              <Label>ICT service</Label>
              <Select value={ictServiceId} onValueChange={setIctServiceId}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {serviceList.map((s) => (
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
              <Select value={criticalityValue} onValueChange={onCriticalityChange}>
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
              <Select value={dependencyValue} onValueChange={onDependencyChange}>
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
              <Select value={exitDifficultyValue} onValueChange={onExitDifficultyChange}>
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
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
