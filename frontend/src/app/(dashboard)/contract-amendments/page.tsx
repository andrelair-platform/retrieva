import { FileSignature } from 'lucide-react';
import { AgentSurfacePlaceholder } from '@/features/command-center/components/agent-surface-placeholder';

export default function Page() {
  return (
    <AgentSurfacePlaceholder
      agentKey="redliner"
      bulletsKey="contractAmendments"
      icon={FileSignature}
      accent="text-chart-2"
    />
  );
}
