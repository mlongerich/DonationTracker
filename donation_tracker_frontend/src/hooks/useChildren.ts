import { useState, useCallback } from 'react';
import apiClient from '../api/client';
import { Child, Sponsorship, PaginationMeta } from '../types';

export interface UseChildrenOptions {
  includeSponsorship?: boolean;
  includeDiscarded?: boolean;
  page?: number;
  perPage?: number;
  search?: string;
}

export interface UseChildrenReturn {
  children: Child[];
  sponsorships: Map<number, Sponsorship[]>;
  loading: boolean;
  error: string | null;
  paginationMeta: PaginationMeta | null;
  fetchChildren: (options?: UseChildrenOptions) => Promise<void>;
  refetch: (options?: UseChildrenOptions) => Promise<void>;
}

export const useChildren = (): UseChildrenReturn => {
  const [children, setChildren] = useState<Child[]>([]);
  const [sponsorships, setSponsorships] = useState<Map<number, Sponsorship[]>>(
    new Map()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(
    null
  );

  const fetchChildren = useCallback(
    async (options: UseChildrenOptions = {}) => {
      setLoading(true);
      setError(null);

      try {
        const params: Record<string, unknown> = {};

        if (options.includeSponsorship) {
          params.include_sponsorships = true;
        }
        if (options.includeDiscarded) {
          params.include_discarded = 'true';
        }
        if (options.page) {
          params.page = options.page;
        }
        if (options.perPage) {
          params.per_page = options.perPage;
        }
        if (options.search) {
          params.q = { name_cont: options.search };
        }

        const response = await apiClient.get('/api/children', { params });
        setChildren(response.data.children);

        if (response.data.meta) {
          setPaginationMeta(response.data.meta);
        }

        // Build sponsorship map
        const sponsorshipMap = new Map<number, Sponsorship[]>();
        response.data.children.forEach(
          (child: Child & { sponsorships?: Sponsorship[] }) => {
            if (child.sponsorships) {
              sponsorshipMap.set(child.id, child.sponsorships);
            }
          }
        );
        setSponsorships(sponsorshipMap);
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error || 'Failed to fetch children';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    children,
    sponsorships,
    loading,
    error,
    paginationMeta,
    fetchChildren,
    refetch: fetchChildren,
  };
};
