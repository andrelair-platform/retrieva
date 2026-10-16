/**
 * RTV-87 — approvalsApi hits /approvals and the browser submits a decision (never resumes the graph).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet, mockPost } = vi.hoisted(() => ({ mockGet: vi.fn(), mockPost: vi.fn() }));

vi.mock('@/shared/api/client', () => ({
  default: { get: mockGet, post: mockPost },
  getErrorMessage: (e: unknown) => String(e),
}));

import { approvalsApi, decisionNeedsJustification } from '@/features/approval-center/api/approvals';

describe('approvalsApi (RTV-87)', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('list(mine) GETs /approvals with the mine param', async () => {
    mockGet.mockResolvedValue({ data: { status: 'success', message: 'ok', data: { approvals: [{ id: 'a1', gate: 'confirm_arrangement' }] } } });
    const res = await approvalsApi.list(true);
    const [url, cfg] = mockGet.mock.calls[0];
    expect(url).toBe('/approvals');
    expect(cfg).toEqual({ params: { mine: true } });
    expect(res.data?.approvals[0].gate).toBe('confirm_arrangement');
  });

  it('decide() POSTs the decision to /approvals/:id/decision', async () => {
    mockPost.mockResolvedValue({ data: { status: 'success', message: 'ok', data: { approvalId: 'a1', decision: 'approve', status: 'approved', run: { id: 'r1', status: 'done' } } } });
    const res = await approvalsApi.decide('a1', { decision: 'approve', expectedRunVersion: 0 });
    const [url, body] = mockPost.mock.calls[0];
    expect(url).toBe('/approvals/a1/decision');
    expect(body).toEqual({ decision: 'approve', expectedRunVersion: 0 });
    expect(res.data?.status).toBe('approved');
  });

  it('reject / request_changes / edit require a justification; approve does not', () => {
    expect(decisionNeedsJustification('reject')).toBe(true);
    expect(decisionNeedsJustification('request_changes')).toBe(true);
    expect(decisionNeedsJustification('edit')).toBe(true);
    expect(decisionNeedsJustification('approve')).toBe(false);
  });
});
