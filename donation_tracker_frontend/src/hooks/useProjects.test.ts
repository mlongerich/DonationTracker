import { renderHook, act, waitFor } from '@testing-library/react';
import { useProjects } from './useProjects';
import apiClient from '../api/client';

jest.mock('../api/client');

describe('useProjects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useProjects());

    expect(result.current.projects).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.paginationMeta).toBeNull();
  });

  it('fetches projects successfully', async () => {
    const mockProjects = [
      { id: 1, title: 'Project A', project_type: 'general' },
      { id: 2, title: 'Project B', project_type: 'campaign' },
    ];
    const mockMeta = { total_pages: 1, current_page: 1, total_count: 2 };

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { projects: mockProjects, meta: mockMeta },
    });

    const { result } = renderHook(() => useProjects());

    await act(async () => {
      await result.current.fetchProjects({ page: 1, perPage: 10 });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.projects).toEqual(mockProjects);
      expect(result.current.paginationMeta).toEqual(mockMeta);
      expect(result.current.error).toBeNull();
    });

    expect(apiClient.get).toHaveBeenCalledWith('/api/projects', {
      params: {
        page: 1,
        per_page: 10,
        include_discarded: false,
      },
    });
  });
});
