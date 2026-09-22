/**
 * Arrangement UI badges — asserts the §5 verdict vocabulary is surfaced honestly:
 * insufficient_evidence reads as "Insufficient evidence" (human review), never a red "fail".
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  VerdictBadge,
  CriticalityBadge,
  ArrangementTypeBadge,
} from '@/features/arrangements/components/badges';

describe('VerdictBadge', () => {
  it('renders the full §5 verdict vocabulary', () => {
    const { rerender } = render(<VerdictBadge verdict="compliant" />);
    expect(screen.getByText('Compliant')).toBeInTheDocument();
    rerender(<VerdictBadge verdict="partial" />);
    expect(screen.getByText('Partial')).toBeInTheDocument();
    rerender(<VerdictBadge verdict="non_compliant" />);
    expect(screen.getByText('Non-compliant')).toBeInTheDocument();
    rerender(<VerdictBadge verdict="not_applicable" />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('insufficient_evidence is labelled for human review, not a fail, and is not styled destructive', () => {
    render(<VerdictBadge verdict="insufficient_evidence" />);
    const badge = screen.getByText('Insufficient evidence');
    expect(badge).toBeInTheDocument();
    // neutral/muted styling — never the red destructive fill
    expect(badge.className).toContain('text-muted-foreground');
    expect(badge.className).not.toContain('bg-destructive');
  });
});

describe('CriticalityBadge', () => {
  it('renders a dash when no criticality is set', () => {
    render(<CriticalityBadge value={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
  it('renders Critical for a critical arrangement', () => {
    render(<CriticalityBadge value="critical" />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });
});

describe('ArrangementTypeBadge', () => {
  it('renders Intra-group for intra_group', () => {
    render(<ArrangementTypeBadge value="intra_group" />);
    expect(screen.getByText('Intra-group')).toBeInTheDocument();
  });
});
