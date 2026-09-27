/**
 * RTV-43 — arrangementsApi risk register calls: getRisks (GET) + updateRisk (PATCH lifecycle),
 * and getFindings now surfaces the RTV-42 coverage metric.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet, mockPatch } = vi.hoisted(() => ({ mockGet: vi.fn(), mockPatch: vi.fn() }));

vi.mock('@/lib/api/client', () => ({
  default: { get: mockGet, patch: mockPatch },
  getErrorMessage: (e: unknown) => String(e),
}));

import { arrangementsApi } from '@/features/arrangements/api/arrangements';

describe('arrangementsApi risk register (RTV-43)', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPatch.mockReset();
  });

  it('getRisks GETs the arrangement risks endpoint', async () => {
    mockGet.mockResolvedValue({ data: { data: { risks: [{ id: 'r1', status: 'open' }] } } });
    const res = await arrangementsApi.getRisks('arr-1');
    expect(mockGet.mock.calls[0][0]).toBe('/arrangements/arr-1/risks');
    expect(res.data?.risks[0].id).toBe('r1');
  });

  it('updateRisk PATCHes a progress transition without a reason', async () => {
    mockPatch.mockResolvedValue({ data: { data: { risk: { id: 'r1', status: 'mitigating' } } } });
    await arrangementsApi.updateRisk('arr-1', 'r1', 'mitigating');
    const [url, body] = mockPatch.mock.calls[0];
    expect(url).toBe('/arrangements/arr-1/risks/r1');
    expect(body).toEqual({ status: 'mitigating' });
  });

  it('updateRisk includes the rationale when accepting a risk', async () => {
    mockPatch.mockResolvedValue({ data: { data: { risk: { id: 'r1', status: 'accepted' } } } });
    await arrangementsApi.updateRisk('arr-1', 'r1', 'accepted', 'residual risk tolerable');
    expect(mockPatch.mock.calls[0][1]).toEqual({ status: 'accepted', reason: 'residual risk tolerable' });
  });
});

describe('arrangementsApi.getFindings coverage (RTV-42)', () => {
  beforeEach(() => mockGet.mockReset());

  it('surfaces the coverage metric alongside findings', async () => {
    mockGet.mockResolvedValue({
      data: {
        data: {
          findings: [{ id: 'f1' }],
          staleCount: 0,
          coverage: { metricLabel: 'control/evidence coverage', coverage: 0.5, confidence: 0.4 },
        },
      },
    });
    const res = await arrangementsApi.getFindings('arr-1');
    expect(mockGet.mock.calls[0][0]).toBe('/arrangements/arr-1/findings');
    expect(res.data?.coverage.metricLabel).toBe('control/evidence coverage');
    expect(res.data?.coverage.coverage).toBe(0.5);
  });
});
