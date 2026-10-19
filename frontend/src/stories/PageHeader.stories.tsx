import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Inbox, BookText, ShieldCheck, Activity, FileDown, Plus } from 'lucide-react';

import { PageHeader, PageShell } from '@/shared/ui/page-header';
import { Button } from '@/components/ui/button';

/**
 * The shared page header (redesign Phase 2). One consistent treatment — icon chip + display-font
 * title + muted description + right-aligned actions — replacing the per-page ad-hoc h1s
 * (text-xl / text-2xl / text-3xl, p-6 vs none) scattered across the app.
 */
const meta: Meta<typeof PageHeader> = {
  title: 'App/Page Header',
  component: PageHeader,
  parameters: { layout: 'fullscreen', backgrounds: { default: 'light' } },
};
export default meta;
type Story = StoryObj<typeof PageHeader>;

/** The variants, stacked in a PageShell to show the standard container + spacing. */
export const Variants: Story = {
  render: () => (
    <PageShell>
      <PageHeader
        icon={Inbox}
        title="Decision Inbox"
        description="Everything the AI concluded that awaits your decision — least-confident first. The AI drafts; you decide."
        actions={<Button variant="outline">Accept all high-confidence</Button>}
      />
      <div className="h-px bg-border" />
      <PageHeader
        icon={BookText}
        title="Register of Information"
        description="DORA RT.02.01 — generated on demand from the arrangement graph."
        actions={
          <Button variant="outline" size="sm">
            <FileDown className="mr-2 h-4 w-4" /> Export XLSX
          </Button>
        }
      />
      <div className="h-px bg-border" />
      <PageHeader
        icon={Activity}
        title="Assessment workspace"
        description="Start a DORA assessment and watch the agents work. You approve the key decisions."
      />
      <div className="h-px bg-border" />
      <PageHeader
        title="ICT Arrangements"
        description="The DORA contractual arrangements — the core object risk is tracked against."
        actions={
          <>
            <Button variant="outline" size="sm">Import from contract</Button>
            <Button size="sm"><Plus className="mr-1.5 h-4 w-4" /> New arrangement</Button>
          </>
        }
      />
      <div className="h-px bg-border" />
      <PageHeader
        icon={ShieldCheck}
        title="Approval center"
        description="Review what the agents propose and decide. You stay accountable for every verdict."
        actions={<Button variant="outline" size="sm">Assigned to me</Button>}
      />
    </PageShell>
  ),
};
