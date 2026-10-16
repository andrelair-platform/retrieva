/**
 * RTV-86 — assessmentRunsApi hits the agentic endpoints and unwraps the ApiResponse envelope.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet, mockPost } = vi.hoisted(() => ({ mockGet: vi.fn(), mockPost: vi.fn() }));

vi.mock('@/shared/api/client', () => ({
  default: { get: mockGet, post: mockPost },
  getErrorMessage: (e: unknown) => String(e),
}));

import { assessmentRunsApi, ACTIVE_STATUSES, TERMINAL_STATUSES, RUN_STAGES } from '@/features/assessment-runs/api/assessment-runs';

describe('assessmentRunsApi (RTV-86)', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('list() GETs /assessment-runs and returns the envelope', async () => {
    mockGet.mockResolvedValue({ data: { status: 'success', message: 'ok', data: { runs: [{ id: 'r1', status: 'running' }] } } });
    const res = await assessmentRunsApi.list();
    expect(mockGet.mock.calls[0][0]).toBe('/assessment-runs');
    expect(res.data?.runs[0].id).toBe('r1');
  });

  it('start() POSTs the arrangementId to /assessment-runs', async () => {
    mockPost.mockResolvedValue({ data: { status: 'success', message: 'ok', data: { run: { id: 'r2' }, waiting: true, interrupt: null } } });
    const res = await assessmentRunsApi.start('arr-1');
    const [url, body] = mockPost.mock.calls[0];
    expect(url).toBe('/assessment-runs');
    expect(body).toEqual({ arrangementId: 'arr-1' });
    expect(res.data?.waiting).toBe(true);
  });

  it('status helpers partition the lifecycle (no overlap, covers the enum)', () => {
    expect(ACTIVE_STATUSES).toContain('waiting_human');
    expect(TERMINAL_STATUSES).toContain('done');
    expect(ACTIVE_STATUSES.some((s) => TERMINAL_STATUSES.includes(s))).toBe(false);
    expect(RUN_STAGES).toEqual(['intake', 'confirm_gate', 'gap', 'findings']);
  });
});
