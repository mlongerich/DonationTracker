import { renderHook, act, waitFor } from '@testing-library/react';
import { useSponsorships } from './useSponsorships';
import apiClient from '../api/client';

jest.mock('../api/client');

describe('useSponsorships', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useSponsorships());

    expect(result.current.sponsorships).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.paginationMeta).toBeNull();
  });

  it('fetches sponsorships successfully', async () => {
    const mockSponsorships = [
      {
        id: 1,
        donor_id: 1,
        child_id: 1,
        amount: 5000,
        start_date: '2024-01-01',
      },
      {
        id: 2,
        donor_id: 2,
        child_id: 2,
        amount: 7500,
        start_date: '2024-01-15',
      },
    ];
    const mockMeta = { total_pages: 1, current_page: 1, total_count: 2 };

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { sponsorships: mockSponsorships, meta: mockMeta },
    });

    const { result } = renderHook(() => useSponsorships());

    await act(async () => {
      await result.current.fetchSponsorships({ page: 1, perPage: 25 });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.sponsorships).toEqual(mockSponsorships);
    expect(result.current.paginationMeta).toEqual(mockMeta);
    expect(result.current.error).toBeNull();

    expect(apiClient.get).toHaveBeenCalledWith('/api/sponsorships', {
      params: {
        page: 1,
        per_page: 25,
        q: { end_date_null: true },
      },
    });
  });

  it('ends sponsorship successfully', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(() => useSponsorships());

    let response;
    await act(async () => {
      response = await result.current.endSponsorship(1);
    });

    expect(response).toEqual({ success: true });
    expect(apiClient.delete).toHaveBeenCalledWith('/api/sponsorships/1');
  });
});
