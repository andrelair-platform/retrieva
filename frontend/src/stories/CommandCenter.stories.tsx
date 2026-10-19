import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import '@/shared/i18n/config'; // side-effect: init the global i18n singleton
import { CommandCenterPage } from '@/features/command-center/components/command-center-page';
import type { DecisionQueue } from '@/features/decision-inbox/api/decision-inbox';

// Seed the org-wide decision queue so the posture + "what needs you" render populated.
const MOCK_QUEUE: DecisionQueue = {
  counts: { findings: 2, risks: 3, total: 5 },
  items: [
    {
      kind: 'risk', id: 'r1', arrangementId: 'a1', providerName: 'Acme Cloud',
      businessFunctionName: 'Claims platform', controlId: 'DORA-28.4', urgency: 98,
      createdAt: '2026-10-18T08:00:00Z', severity: 'critical', title: 'No audited exit plan for a critical function',
    },
    {
      kind: 'risk', id: 'r2', arrangementId: 'a2', providerName: 'NimbusPay',
      businessFunctionName: 'Payments', controlId: 'DORA-30.2', urgency: 86,
      createdAt: '2026-10-18T08:00:00Z', severity: 'high', title: 'Missing Art. 30 subcontracting clause',
    },
    {
      kind: 'finding', id: 'f1', arrangementId: 'a3', providerName: 'DataVault',
      businessFunctionName: 'Document storage', controlId: 'DORA-9.3', urgency: 72,
      createdAt: '2026-10-18T08:00:00Z', verdict: 'partial', confidence: 0.61,
    },
    {
      kind: 'risk', id: 'r3', arrangementId: 'a4', providerName: 'SignFlow',
      businessFunctionName: 'e-Signature', controlId: 'DORA-28.7', urgency: 55,
      createdAt: '2026-10-18T08:00:00Z', severity: 'medium', title: 'Concentration risk on shared sub-processor',
    },
    {
      kind: 'finding', id: 'f2', arrangementId: 'a5', providerName: 'MailRelay',
      businessFunctionName: 'Notifications', controlId: 'DORA-11.1', urgency: 40,
      createdAt: '2026-10-18T08:00:00Z', verdict: 'non_compliant', confidence: 0.48,
    },
  ],
};

function withSeededQuery(data: DecisionQueue | null) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnMount: false } },
  });
  qc.setQueryData(['decision-queue'], data);
  return function Decorator(Story: React.ComponentType) {
    return (
      <QueryClientProvider client={qc}>
        <Story />
      </QueryClientProvider>
    );
  };
}

const meta: Meta<typeof CommandCenterPage> = {
  title: 'App/Command Center',
  component: CommandCenterPage,
  parameters: { layout: 'fullscreen', backgrounds: { default: 'light' } },
};
export default meta;
type Story = StoryObj<typeof CommandCenterPage>;

/** Populated: a red posture (one critical open risk) with a full decision queue. */
export const Populated: Story = {
  decorators: [withSeededQuery(MOCK_QUEUE)],
  render: () => <CommandCenterPage />,
};

/** All-clear: empty queue → green posture + the empty state. */
export const AllClear: Story = {
  decorators: [withSeededQuery({ counts: { findings: 0, risks: 0, total: 0 }, items: [] })],
  render: () => <CommandCenterPage />,
};
