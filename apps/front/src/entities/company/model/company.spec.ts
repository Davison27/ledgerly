import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCompany, updateCompany, companyNeedsSetup } from './company';
import { getCompany, updateCompany as updateCompanyRequest } from '../api/company.api';

vi.mock('../api/company.api', () => ({
  getCompany: vi.fn(),
  updateCompany: vi.fn(),
}));

describe('company view model', () => {
  beforeEach(() => {
    vi.mocked(getCompany).mockReset();
    vi.mocked(updateCompanyRequest).mockReset();
  });

  it('maps nullable company profile fields to optional UI fields', async () => {
    vi.mocked(getCompany).mockResolvedValue({
      id: 'company-1',
      name: 'Acme',
      legalName: null,
      taxId: null,
      logo: null,
      brandColor: null,
    });

    await expect(fetchCompany()).resolves.toEqual({
      id: 'company-1',
      name: 'Acme',
      legalName: undefined,
      taxId: undefined,
      logo: undefined,
      brandColor: undefined,
    });
  });

  it('detects the setup state from the company identifier', () => {
    expect(companyNeedsSetup({ id: '', name: '' })).toBe(true);
    expect(companyNeedsSetup({ id: 'company-1', name: 'Acme' })).toBe(false);
  });

  it('delegates company updates and maps the response', async () => {
    vi.mocked(updateCompanyRequest).mockResolvedValue({ id: 'company-1', name: 'Acme Updated' });

    await expect(updateCompany({ name: 'Acme Updated' })).resolves.toEqual({
      id: 'company-1',
      name: 'Acme Updated',
    });
    expect(updateCompanyRequest).toHaveBeenCalledWith({ name: 'Acme Updated' });
  });
});
