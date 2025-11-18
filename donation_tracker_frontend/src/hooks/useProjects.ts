import { useState, useCallback } from 'react';
import apiClient from '../api/client';
import { Project, PaginationMeta } from '../types';

export interface UseProjectsOptions {
  includeDiscarded?: boolean;
  page?: number;
  perPage?: number;
}

export interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: string | null;
  paginationMeta: PaginationMeta | null;
  fetchProjects: (options?: UseProjectsOptions) => Promise<void>;
}

export const useProjects = (): UseProjectsReturn => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);

  const fetchProjects = useCallback(async (options: UseProjectsOptions = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, unknown> = {
        page: options.page || 1,
        per_page: options.perPage || 10,
        include_discarded: options.includeDiscarded || false,
      };

      const response = await apiClient.get('/api/projects', { params });
      setProjects(response.data.projects);
      setPaginationMeta(response.data.meta);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    projects,
    loading,
    error,
    paginationMeta,
    fetchProjects,
  };
};
