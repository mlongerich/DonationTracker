import { useState, useCallback } from 'react';
import apiClient from '../api/client';
import { Donor, PaginationMeta } from '../types';

export interface UseDonorsOptions {
  includeDiscarded?: boolean;
  page?: number;
  perPage?: number;
  search?: string;
}

export interface UseDonorsReturn {
  donors: Donor[];
  loading: boolean;
  error: string | null;
  paginationMeta: PaginationMeta | null;
  fetchDonors: (options?: UseDonorsOptions) => Promise<void>;
  archiveDonor: (id: number) => Promise<{ success: boolean; error?: string }>;
  restoreDonor: (id: number) => Promise<{ success: boolean; error?: string }>;
}

export const useDonors = (): UseDonorsReturn => {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(
    null
  );

  const fetchDonors = useCallback(async (options: UseDonorsOptions = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, unknown> = {
        page: options.page || 1,
        per_page: options.perPage || 10,
        include_discarded: options.includeDiscarded || false,
      };

      if (options.search?.trim()) {
        params.q = {
          g: [
            {
              m: 'or',
              name_cont: options.search,
              email_cont: options.search,
              phone_cont: options.search,
              address_line1_cont: options.search,
              city_cont: options.search,
              state_cont: options.search,
              zip_code_cont: options.search,
            },
          ],
        };
      }

      const response = await apiClient.get('/api/donors', { params });
      setDonors(response.data.donors);
      setPaginationMeta(response.data.meta);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch donors');
    } finally {
      setLoading(false);
    }
  }, []);

  const archiveDonor = useCallback(async (id: number) => {
    try {
      await apiClient.delete(`/api/donors/${id}`);
      return { success: true };
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.join(', ') ||
        err.response?.data?.error ||
        'Failed to archive donor';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, []);

  const restoreDonor = useCallback(async (id: number) => {
    try {
      await apiClient.post(`/api/donors/${id}/restore`);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error || 'Failed to restore donor',
      };
    }
  }, []);

  return {
    donors,
    loading,
    error,
    paginationMeta,
    fetchDonors,
    archiveDonor,
    restoreDonor,
  };
};
