import { useState, useCallback } from 'react';
import apiClient from '../api/client';
import { Sponsorship, PaginationMeta } from '../types';

export interface UseSponsorshipsOptions {
  page?: number;
  perPage?: number;
  search?: string;
  showEnded?: boolean;
  childId?: number;
}

export interface UseSponsorshipsReturn {
  sponsorships: Sponsorship[];
  loading: boolean;
  error: string | null;
  paginationMeta: PaginationMeta | null;
  fetchSponsorships: (options?: UseSponsorshipsOptions) => Promise<void>;
  endSponsorship: (id: number) => Promise<{ success: boolean; error?: string }>;
}

export const useSponsorships = (): UseSponsorshipsReturn => {
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(
    null
  );

  const fetchSponsorships = useCallback(
    async (options: UseSponsorshipsOptions = {}) => {
      setLoading(true);
      setError(null);

      try {
        const params: Record<string, unknown> = {
          page: options.page || 1,
          per_page: options.perPage || 25,
        };

        const queryParams: Record<string, unknown> = {};

        if (options.search?.trim()) {
          queryParams.donor_name_or_child_name_cont = options.search;
        }

        if (!options.showEnded) {
          queryParams.end_date_null = true;
        }

        if (Object.keys(queryParams).length > 0) {
          params.q = queryParams;
        }

        if (options.childId) {
          params.child_id = options.childId;
        }

        const response = await apiClient.get('/api/sponsorships', { params });
        setSponsorships(response.data.sponsorships);
        setPaginationMeta(response.data.meta);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to fetch sponsorships');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const endSponsorship = useCallback(async (id: number) => {
    try {
      await apiClient.delete(`/api/sponsorships/${id}`);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error || 'Failed to end sponsorship',
      };
    }
  }, []);

  return {
    sponsorships,
    loading,
    error,
    paginationMeta,
    fetchSponsorships,
    endSponsorship,
  };
};
