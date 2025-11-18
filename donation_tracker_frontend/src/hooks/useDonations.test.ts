import { renderHook, act, waitFor } from '@testing-library/react';
import { useDonations } from './useDonations';
import apiClient from '../api/client';

jest.mock('../api/client');

describe('useDonations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useDonations());

    expect(result.current.donations).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.paginationMeta).toBeNull();
  });

  it('fetches donations successfully', async () => {
    const mockDonations = [
      { id: 1, amount: 10000, date: '2024-01-01', payment_method: 'cash' },
      { id: 2, amount: 5000, date: '2024-01-02', payment_method: 'check' },
    ];
    const mockMeta = { total_pages: 1, current_page: 1, total_count: 2 };

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { donations: mockDonations, meta: mockMeta },
    });

    const { result } = renderHook(() => useDonations());

    await act(async () => {
      await result.current.fetchDonations({ page: 1, perPage: 10 });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.donations).toEqual(mockDonations);
    expect(result.current.paginationMeta).toEqual(mockMeta);
    expect(result.current.error).toBeNull();

    expect(apiClient.get).toHaveBeenCalledWith('/api/donations', {
      params: {
        page: 1,
        per_page: 10,
      },
    });
  });

  it('fetches donations with date range filter', async () => {
    const mockDonations = [
      { id: 1, amount: 10000, date: '2024-01-15', payment_method: 'cash' },
    ];

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { donations: mockDonations, meta: { total_pages: 1 } },
    });

    const { result } = renderHook(() => useDonations());

    await act(async () => {
      await result.current.fetchDonations({
        dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
      });
    });

    expect(apiClient.get).toHaveBeenCalledWith('/api/donations', {
      params: {
        page: 1,
        per_page: 10,
        'q[date_gteq]': '2024-01-01',
        'q[date_lteq]': '2024-01-31',
      },
    });
  });

  it('handles fetch errors', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue({
      response: { data: { error: 'Server error' } },
    });

    const { result } = renderHook(() => useDonations());

    await act(async () => {
      await result.current.fetchDonations();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Server error');
    expect(result.current.donations).toEqual([]);
  });
});
