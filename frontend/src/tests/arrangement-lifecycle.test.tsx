/**
 * RTV-31 — the lifecycle UI + API contract. The LifecycleBadge labels each state honestly (active is
 * a green "in the register", exited is muted/struck-through); the api posts the transition to the
 * lifecycle endpoint and reads back the current state + allowed transitions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { LifecycleBadge } from '@/features/arrangements/components/badges';

describe('LifecycleBadge (RTV-31)', () => {
  it('labels each lifecycle state', () => {
    const { rerender } = render(<LifecycleBadge value="prospect" />);
    expect(screen.getByText('Prospect')).toBeInTheDocument();
    rerender(<LifecycleBadge value="due_diligence" />);
    expect(screen.getByText('Due diligence')).toBeInTheDocument();
    rerender(<LifecycleBadge value="under_review" />);
    expect(screen.getByText('Under review')).toBeInTheDocument();
    rerender(<LifecycleBadge value="exited" />);
    expect(screen.getByText('Exited')).toBeInTheDocument();
  });

  it('reads active as a green (in-the-register) state, never destructive', () => {
    render(<LifecycleBadge value="active" />);
    const badge = screen.getByText('Active');
    expect(badge.className).toContain('text-green-700');
    expect(badge.className).not.toContain('bg-destructive');
  });
});

const { mockGet, mockPatch } = vi.hoisted(() => ({ mockGet: vi.fn(), mockPatch: vi.fn() }));
vi.mock('@/lib/api/client', () => ({
  default: { get: mockGet, patch: mockPatch },
  getErrorMessage: (e: unknown) => String(e),
}));

import { arrangementsApi } from '@/features/arrangements/api/arrangements';

describe('arrangementsApi lifecycle (RTV-31)', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPatch.mockReset();
  });

  it('reads the current state + allowed transitions', async () => {
    mockGet.mockResolvedValue({
      data: { data: { status: 'active', transitions: [{ transition: 'start_review', to: 'under_review', approval: false }] } },
    });

    const res = await arrangementsApi.getLifecycle('arr-1');

    expect(mockGet.mock.calls[0][0]).toBe('/arrangements/arr-1/lifecycle');
    expect(res.data?.status).toBe('active');
    expect(res.data?.transitions[0].transition).toBe('start_review');
  });

  it('PATCHes a transition to the lifecycle endpoint', async () => {
    mockPatch.mockResolvedValue({ data: { data: { arrangement: { id: 'arr-1', lifecycleStatus: 'under_review' } } } });

    const res = await arrangementsApi.setLifecycle('arr-1', 'start_review');

    const [url, body] = mockPatch.mock.calls[0];
    expect(url).toBe('/arrangements/arr-1/lifecycle');
    expect(body).toEqual({ transition: 'start_review' });
    expect(res.data?.arrangement.lifecycleStatus).toBe('under_review');
  });
});
