import { Radar } from 'lucide-react';
import { AgentSurfacePlaceholder } from '@/features/command-center/components/agent-surface-placeholder';

export default function Page() {
  return (
    <AgentSurfacePlaceholder
      agentKey="surveillance"
      bulletsKey="surveillance"
      icon={Radar}
      accent="text-chart-3"
    />
  );
}
