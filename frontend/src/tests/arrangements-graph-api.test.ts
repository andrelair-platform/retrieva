/**
 * arrangementsApi graph helpers — provider + ICT-service lookups against
 * /arrangement-graph. Mocks the Axios client so no real HTTP happens.
 * Covers the listIctServices(providerId?) query-param branch (with + without).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet, mockPost } = vi.hoisted(() => ({ mockGet: vi.fn(), mockPost: vi.fn() }));

vi.mock('@/lib/api/client', () => ({
  default: { get: mockGet, post: mockPost },
  getErrorMessage: (e: unknown) => String(e),
}));

import { arrangementsApi } from '@/features/arrangements/api/arrangements';

describe('arrangementsApi graph helpers', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('lists providers via GET /arrangement-graph/providers', async () => {
    mockGet.mockResolvedValue({ data: { data: { providers: [] } } });
    await arrangementsApi.listProviders();
    expect(mockGet).toHaveBeenCalledWith('/arrangement-graph/providers');
  });

  it('creates a provider via POST /arrangement-graph/providers', async () => {
    mockPost.mockResolvedValue({ data: { data: { provider: { id: 'p1' } } } });
    await arrangementsApi.createProvider({ name: 'Microsoft' });
    expect(mockPost).toHaveBeenCalledWith('/arrangement-graph/providers', { name: 'Microsoft' });
  });

  it('lists ICT services with no provider filter (empty params branch)', async () => {
    mockGet.mockResolvedValue({ data: { data: { ictServices: [] } } });
    await arrangementsApi.listIctServices();
    expect(mockGet).toHaveBeenCalledWith('/arrangement-graph/ict-services', { params: {} });
  });

  it('lists ICT services scoped to a providerId (populated params branch)', async () => {
    mockGet.mockResolvedValue({ data: { data: { ictServices: [] } } });
    await arrangementsApi.listIctServices('prov-123');
    expect(mockGet).toHaveBeenCalledWith('/arrangement-graph/ict-services', {
      params: { providerId: 'prov-123' },
    });
  });
});
