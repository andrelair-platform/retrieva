/**
 * RTV-34 — arrangementsApi intake contract. Mocks the Axios client so no real HTTP happens.
 * Verifies the intake upload posts multipart to /arrangements/intake and confirm posts the
 * human-validated proposal to /arrangements/intake/confirm.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet, mockPost } = vi.hoisted(() => ({ mockGet: vi.fn(), mockPost: vi.fn() }));

vi.mock('@/shared/api/client', () => ({
  default: { get: mockGet, post: mockPost },
  getErrorMessage: (e: unknown) => String(e),
}));

import { arrangementsApi, type ArrangementProposal } from '@/features/arrangements/api/arrangements';

const PROPOSAL: ArrangementProposal = {
  providerName: 'Microsoft',
  subcontractors: ['OpenAI'],
  ictServiceName: 'Azure',
  legalEntityName: 'Ktayl France',
  businessFunctionName: 'Claims',
  criticalOrImportant: true,
  dataClasses: ['pii'],
  dataResidency: 'FR',
  arrangementType: 'external',
  criticality: 'critical',
  confidence: 0.8,
  notes: '',
};

describe('arrangementsApi intake (RTV-34)', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('uploads a contract as multipart form-data to /arrangements/intake', async () => {
    mockPost.mockResolvedValue({ data: { data: { proposal: PROPOSAL, matches: {}, source: { fileName: 'c.pdf', parsedChars: 100 } } } });
    const file = new File(['contract bytes'], 'c.pdf', { type: 'application/pdf' });

    const res = await arrangementsApi.intake(file);

    expect(mockPost).toHaveBeenCalledTimes(1);
    const [url, body, config] = mockPost.mock.calls[0];
    expect(url).toBe('/arrangements/intake');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('contract')).toBeInstanceOf(File);
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
    expect(res.data?.proposal.providerName).toBe('Microsoft');
  });

  it('submits the validated proposal for governed review', async () => {
    mockPost.mockResolvedValue({ data: { data: { proposal: { id: 'proposal-1', status: 'submitted' } } } });

    const res = await arrangementsApi.confirmIntake(PROPOSAL, 'c.pdf');

    const [url, body] = mockPost.mock.calls[0];
    expect(url).toBe('/arrangements/intake/confirm');
    expect(body).toEqual({ proposal: PROPOSAL, sourceFileName: 'c.pdf' });
    expect(res.data?.proposal.id).toBe('proposal-1');
    expect(res.data?.proposal.status).toBe('submitted');
  });

  it('posts versioned checker and approver decisions', async () => {
    mockPost.mockResolvedValue({ data: { data: { proposal: { id: 'proposal-1' } } } });
    await arrangementsApi.checkIntakeProposal('proposal-1', {
      expectedVersion: 1,
      decision: 'approve',
      justification: 'Evidence checked',
    });
    expect(mockPost).toHaveBeenLastCalledWith('/arrangements/intake/proposals/proposal-1/check', {
      expectedVersion: 1,
      decision: 'approve',
      justification: 'Evidence checked',
    });

    await arrangementsApi.approveIntakeProposal('proposal-1', {
      expectedVersion: 2,
      decision: 'approve',
      justification: 'Accountability accepted',
    });
    expect(mockPost).toHaveBeenLastCalledWith('/arrangements/intake/proposals/proposal-1/approve', {
      expectedVersion: 2,
      decision: 'approve',
      justification: 'Accountability accepted',
    });
  });
});
