/**
 * RTV-60 — concentrationApi calls hit the org-scoped concentration endpoints with the right shapes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet, mockPost, mockPatch, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  default: { get: mockGet, post: mockPost, patch: mockPatch, delete: mockDelete },
  getErrorMessage: (e: unknown) => String(e),
}));

import { concentrationApi } from '@/features/concentration/api/concentration';

describe('concentrationApi (RTV-60)', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPatch.mockReset();
    mockDelete.mockReset();
  });

  it('getAnalysis GETs /concentration', async () => {
    mockGet.mockResolvedValue({ data: { data: { coverage: { totalProviders: 3 } } } });
    const res = await concentrationApi.getAnalysis();
    expect(mockGet.mock.calls[0][0]).toBe('/concentration');
    expect(res.data?.coverage.totalProviders).toBe(3);
  });

  it('getGraph GETs /concentration/graph', async () => {
    mockGet.mockResolvedValue({ data: { data: { nodes: [], edges: [] } } });
    await concentrationApi.getGraph();
    expect(mockGet.mock.calls[0][0]).toBe('/concentration/graph');
  });

  it('saveFunction POSTs /concentration/functions with the payload', async () => {
    mockPost.mockResolvedValue({ data: { data: { function: { id: 'cf1' } } } });
    await concentrationApi.saveFunction({ name: 'Claims', criticality: 'critical', dependsOn: ['w1'] });
    const [url, body] = mockPost.mock.calls[0];
    expect(url).toBe('/concentration/functions');
    expect(body).toMatchObject({ name: 'Claims', criticality: 'critical', dependsOn: ['w1'] });
  });

  it('deleteFunction DELETEs /concentration/functions/:id', async () => {
    mockDelete.mockResolvedValue({ data: { data: { id: 'cf1' } } });
    await concentrationApi.deleteFunction('cf1');
    expect(mockDelete.mock.calls[0][0]).toBe('/concentration/functions/cf1');
  });

  it('confirmDependency PATCHes /concentration/dependencies/:id with { confirmed }', async () => {
    mockPatch.mockResolvedValue({ data: { data: { dependency: { id: 'd1', confirmed: true } } } });
    await concentrationApi.confirmDependency('d1', true);
    const [url, body] = mockPatch.mock.calls[0];
    expect(url).toBe('/concentration/dependencies/d1');
    expect(body).toEqual({ confirmed: true });
  });

  it('extractSubProviders POSTs /concentration/extract/:workspaceId (RTV-72)', async () => {
    mockPost.mockResolvedValue({ data: { data: { created: 2, candidates: [{ name: 'OpenAI' }] } } });
    const res = await concentrationApi.extractSubProviders('ws-123');
    expect(mockPost.mock.calls[0][0]).toBe('/concentration/extract/ws-123');
    expect(res.data?.created).toBe(2);
  });
});
