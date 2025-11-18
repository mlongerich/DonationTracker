import { useState, useCallback } from 'react';
import apiClient from '../api/client';
import { Donation, PaginationMeta } from '../types';

export interface UseDonationsOptions {
  page?: number;
  perPage?: number;
  dateRange?: { startDate: string | null; endDate: string | null };
  donorId?: number | null;
  paymentMethod?: string | null;
}

export interface UseDonationsReturn {
  donations: Donation[];
  loading: boolean;
  error: string | null;
  paginationMeta: PaginationMeta | null;
  fetchDonations: (options?: UseDonationsOptions) => Promise<void>;
}

export const useDonations = (): UseDonationsReturn => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(
    null
  );

  const fetchDonations = useCallback(
    async (options: UseDonationsOptions = {}) => {
      setLoading(true);
      setError(null);

      try {
        const queryParams: Record<string, unknown> = {};

        if (options.dateRange?.startDate) {
          queryParams['q[date_gteq]'] = options.dateRange.startDate;
        }
        if (options.dateRange?.endDate) {
          queryParams['q[date_lteq]'] = options.dateRange.endDate;
        }
        if (options.donorId) {
          queryParams['q[donor_id_eq]'] = options.donorId;
        }
        if (options.paymentMethod) {
          queryParams['q[payment_method_eq]'] = options.paymentMethod;
        }

        const params: Record<string, unknown> = {
          page: options.page || 1,
          per_page: options.perPage || 10,
          ...queryParams,
        };

        const response = await apiClient.get('/api/donations', { params });
        setDonations(response.data.donations);
        setPaginationMeta(response.data.meta);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to fetch donations');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    donations,
    loading,
    error,
    paginationMeta,
    fetchDonations,
  };
};
