import { Badge } from '@/components/ui/badge';
import type { Criticality, Verdict, ArrangementType } from '@/features/arrangements/api/arrangements';

const VERDICT_LABEL: Record<Verdict, string> = {
  compliant: 'Compliant',
  partial: 'Partial',
  non_compliant: 'Non-compliant',
  insufficient_evidence: 'Insufficient evidence',
  not_applicable: 'N/A',
};

/** Verdict badge — insufficient_evidence is deliberately neutral (human review), never a red "fail". */
export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const cls: Record<Verdict, string> = {
    compliant: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100',
    partial: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100',
    non_compliant: '',
    insufficient_evidence: 'bg-muted text-muted-foreground border-muted',
    not_applicable: '',
  };
  const variant = verdict === 'non_compliant' ? 'destructive' : verdict === 'not_applicable' ? 'outline' : undefined;
  return (
    <Badge variant={variant} className={`text-xs ${cls[verdict]}`}>
      {VERDICT_LABEL[verdict]}
    </Badge>
  );
}

export function CriticalityBadge({ value }: { value: Criticality | null | undefined }) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  if (value === 'critical') return <Badge variant="destructive" className="text-xs">Critical</Badge>;
  if (value === 'important')
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-xs">Important</Badge>;
  return <Badge variant="outline" className="text-xs">Standard</Badge>;
}

export function ArrangementTypeBadge({ value }: { value: ArrangementType }) {
  return (
    <Badge variant="outline" className="text-xs capitalize">
      {value === 'intra_group' ? 'Intra-group' : 'External'}
    </Badge>
  );
}
