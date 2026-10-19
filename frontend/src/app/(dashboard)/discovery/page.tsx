import { Radio } from 'lucide-react';
import { AgentSurfacePlaceholder } from '@/features/command-center/components/agent-surface-placeholder';

export default function Page() {
  return (
    <AgentSurfacePlaceholder
      agentKey="discovery"
      bulletsKey="discovery"
      icon={Radio}
      accent="text-chart-1"
    />
  );
}
