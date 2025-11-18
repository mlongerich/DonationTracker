import { renderHook, act, waitFor } from '@testing-library/react';
import { useDonors } from './useDonors';
import apiClient from '../api/client';

jest.mock('../api/client');

describe('useDonors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useDonors());

    expect(result.current.donors).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.paginationMeta).toBeNull();
  });

  it('fetches donors successfully', async () => {
    const mockDonors = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    ];
    const mockMeta = { total_pages: 1, current_page: 1, total_count: 2 };

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { donors: mockDonors, meta: mockMeta },
    });

    const { result } = renderHook(() => useDonors());

    await act(async () => {
      await result.current.fetchDonors({ page: 1, perPage: 10 });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.donors).toEqual(mockDonors);
    expect(result.current.paginationMeta).toEqual(mockMeta);
    expect(result.current.error).toBeNull();

    expect(apiClient.get).toHaveBeenCalledWith('/api/donors', {
      params: {
        page: 1,
        per_page: 10,
        include_discarded: false,
      },
    });
  });

  it('archives donor successfully', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(() => useDonors());

    let response;
    await act(async () => {
      response = await result.current.archiveDonor(1);
    });

    expect(response).toEqual({ success: true });
    expect(apiClient.delete).toHaveBeenCalledWith('/api/donors/1');
  });

  it('restores donor successfully', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(() => useDonors());

    let response;
    await act(async () => {
      response = await result.current.restoreDonor(1);
    });

    expect(response).toEqual({ success: true });
    expect(apiClient.post).toHaveBeenCalledWith('/api/donors/1/restore');
  });

  it('handles fetch errors', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue({
      response: { data: { error: 'Server error' } },
    });

    const { result } = renderHook(() => useDonors());

    await act(async () => {
      await result.current.fetchDonors();
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Server error');
      expect(result.current.donors).toEqual([]);
      expect(result.current.loading).toBe(false);
    });
  });
});
