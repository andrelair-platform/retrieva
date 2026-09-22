/**
 * RTV-55 — arrangementsApi.decideFinding posts the checker's decision to the finding endpoint.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPatch } = vi.hoisted(() => ({ mockPatch: vi.fn() }));

vi.mock('@/lib/api/client', () => ({
  default: { patch: mockPatch },
  getErrorMessage: (e: unknown) => String(e),
}));

import { arrangementsApi } from '@/features/arrangements/api/arrangements';

describe('arrangementsApi.decideFinding (RTV-55)', () => {
  beforeEach(() => mockPatch.mockReset());

  it('PATCHes the decision to the finding endpoint', async () => {
    mockPatch.mockResolvedValue({ data: { data: { finding: { id: 'f1', status: 'approved' } } } });

    const res = await arrangementsApi.decideFinding('arr-1', 'f1', 'approve');

    const [url, body] = mockPatch.mock.calls[0];
    expect(url).toBe('/arrangements/arr-1/findings/f1');
    expect(body).toEqual({ decision: 'approve' });
    expect(res.data?.finding.status).toBe('approved');
  });
});
