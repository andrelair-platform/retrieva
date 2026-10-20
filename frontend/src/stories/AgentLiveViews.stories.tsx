import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import '@/shared/i18n/config';
import { SurveillancePage } from '@/features/surveillance/components/surveillance-page';
import { ContractAmendmentsPage } from '@/features/contract-amendments/components/contract-amendments-page';
import type { SurveillanceEvent } from '@/features/surveillance/api/surveillance';
import type { ContractAmendment } from '@/features/contract-amendments/api/contract-amendments';

const EVENTS: SurveillanceEvent[] = [
  {
    id: 'e1', organizationId: 'o', runId: 'r', providerNodeId: null, providerName: 'Acme Cloud',
    source: 'statuspage', externalId: 'inc-1', type: 'incident', severity: 'critical',
    title: 'Major outage — EU region API unavailable', summary: 'Provider reports a full outage affecting the EU control plane; ETA unknown.',
    url: 'https://status.acme.example/incidents/1', observedAt: '2026-10-19T06:00:00Z', blastRadius: {}, alerted: true,
    status: 'open', createdAt: '2026-10-19T06:01:00Z', updatedAt: null,
  },
  {
    id: 'e2', organizationId: 'o', runId: 'r', providerNodeId: null, providerName: 'NimbusPay',
    source: 'cve', externalId: 'CVE-2026-1234', type: 'cve', severity: 'high',
    title: 'CVE-2026-1234 — auth bypass in the payments SDK', summary: 'A high-severity authentication-bypass CVE affects a tracked dependency of this provider.',
    url: 'https://osv.dev/vulnerability/CVE-2026-1234', observedAt: '2026-10-18T09:00:00Z', blastRadius: {}, alerted: true,
    status: 'acknowledged', createdAt: '2026-10-18T09:05:00Z', updatedAt: null,
  },
  {
    id: 'e3', organizationId: 'o', runId: 'r', providerNodeId: null, providerName: 'DataVault',
    source: 'statuspage', externalId: 'inc-9', type: 'incident', severity: 'low',
    title: 'Degraded performance on object storage', summary: 'Elevated latency on the storage tier; no data loss reported.',
    url: '', observedAt: '2026-10-17T12:00:00Z', blastRadius: {}, alerted: false,
    status: 'resolved', createdAt: '2026-10-17T12:10:00Z', updatedAt: null,
  },
];

const AMENDMENTS: ContractAmendment[] = [
  {
    id: 'a1', organizationId: 'o', assessmentId: 'as1', vendorName: 'Acme Cloud',
    article: 'Art.30(2)(a)', category: 'Service description', gapLevel: 'missing', templateRef: 'tpl-sd-1',
    draftText: 'The Provider shall maintain a complete and up-to-date description of the ICT services supporting the Client’s critical or important functions, including service levels and locations of data processing.',
    rationale: 'The current contract has no DORA Art. 30(2)(a) service-description clause; this is a mandatory register field.',
    editedText: '', status: 'pending', createdAt: '2026-10-19T06:00:00Z', updatedAt: null,
  },
  {
    id: 'a2', organizationId: 'o', assessmentId: 'as1', vendorName: 'NimbusPay',
    article: 'Art.30(3)(b)', category: 'Subcontracting', gapLevel: 'partial', templateRef: 'tpl-sub-2',
    draftText: 'The Provider shall notify the Client of any intended material change to subcontractors of critical or important functions, with sufficient notice to allow a risk assessment and, where warranted, objection.',
    rationale: 'Existing clause omits the notice period and the Client’s right to object to material subcontracting changes.',
    editedText: '', status: 'pending', createdAt: '2026-10-19T06:00:00Z', updatedAt: null,
  },
];

function seed(key: unknown[], data: unknown) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnMount: false } },
  });
  qc.setQueryData(key, data);
  return function Decorator(Story: React.ComponentType) {
    return (
      <QueryClientProvider client={qc}>
        <Story />
      </QueryClientProvider>
    );
  };
}

const meta: Meta = { title: 'App/Agent Live Views', parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj;

export const Surveillance: Story = {
  decorators: [seed(['surveillance-events', 'all'], EVENTS)],
  render: () => <SurveillancePage />,
};

export const ContractAmendments: Story = {
  decorators: [seed(['contract-amendments', 'all'], AMENDMENTS)],
  render: () => <ContractAmendmentsPage />,
};
