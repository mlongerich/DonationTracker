import { renderHook, act } from '@testing-library/react';
import { useChildren } from './useChildren';
import apiClient from '../api/client';

jest.mock('../api/client');

describe('useChildren', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches children successfully', async () => {
    const mockChildren = [{ id: 1, name: 'Maria' }];
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { children: mockChildren },
    });

    const { result } = renderHook(() => useChildren());

    expect(result.current.loading).toBe(false);

    await act(async () => {
      await result.current.fetchChildren();
    });

    expect(result.current.children).toEqual(mockChildren);
    expect(result.current.loading).toBe(false);
  });

  it('builds sponsorship map from nested data', async () => {
    const mockChildren = [
      {
        id: 1,
        name: 'Maria',
        sponsorships: [
          { id: 10, donor_id: 5, child_id: 1, monthly_amount: '50' },
        ],
      },
    ];
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { children: mockChildren },
    });

    const { result } = renderHook(() => useChildren());

    await act(async () => {
      await result.current.fetchChildren({ includeSponsorship: true });
    });

    const sponsorshipsForChild = result.current.sponsorships.get(1);
    expect(sponsorshipsForChild).toHaveLength(1);
    expect(sponsorshipsForChild![0].id).toBe(10);
  });

  it('includes sponsorships when option is true', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { children: [] },
    });

    const { result } = renderHook(() => useChildren());

    await act(async () => {
      await result.current.fetchChildren({ includeSponsorship: true });
    });

    expect(apiClient.get).toHaveBeenCalledWith('/api/children', {
      params: { include_sponsorships: true },
    });
  });

  it('includes discarded when option is true', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { children: [] },
    });

    const { result } = renderHook(() => useChildren());

    await act(async () => {
      await result.current.fetchChildren({ includeDiscarded: true });
    });

    expect(apiClient.get).toHaveBeenCalledWith('/api/children', {
      params: { include_discarded: 'true' },
    });
  });

  it('handles API errors gracefully', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue({
      response: { data: { error: 'Server error' } },
    });

    const { result } = renderHook(() => useChildren());

    await act(async () => {
      await result.current.fetchChildren();
    });

    expect(result.current.error).toBe('Server error');
    expect(result.current.loading).toBe(false);
  });

  it('provides refetch alias', () => {
    const { result } = renderHook(() => useChildren());
    expect(result.current.refetch).toBe(result.current.fetchChildren);
  });

  it('clears error on successful fetch', async () => {
    (apiClient.get as jest.Mock)
      .mockRejectedValueOnce({ response: { data: { error: 'Error' } } })
      .mockResolvedValueOnce({ data: { children: [] } });

    const { result } = renderHook(() => useChildren());

    await act(async () => {
      await result.current.fetchChildren();
    });
    expect(result.current.error).toBe('Error');

    await act(async () => {
      await result.current.fetchChildren();
    });
    expect(result.current.error).toBe(null);
  });

  it('includes pagination and search params when provided', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { children: [], meta: { total_pages: 5 } },
    });

    const { result } = renderHook(() => useChildren());

    await act(async () => {
      await result.current.fetchChildren({
        page: 2,
        perPage: 10,
        search: 'Maria',
      });
    });

    expect(apiClient.get).toHaveBeenCalledWith('/api/children', {
      params: {
        page: 2,
        per_page: 10,
        q: { name_cont: 'Maria' },
      },
    });
    expect(result.current.paginationMeta).toEqual({ total_pages: 5 });
  });
});
