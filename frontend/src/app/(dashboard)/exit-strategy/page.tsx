import { DoorOpen } from 'lucide-react';
import { AgentSurfacePlaceholder } from '@/features/command-center/components/agent-surface-placeholder';

export default function Page() {
  return (
    <AgentSurfacePlaceholder
      agentKey="exit"
      bulletsKey="exitStrategy"
      icon={DoorOpen}
      accent="text-chart-5"
    />
  );
}
