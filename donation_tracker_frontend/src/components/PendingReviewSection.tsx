import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { Dayjs } from 'dayjs';
import apiClient from '../api/client';
import PendingReviewDonationList from './PendingReviewDonationList';
import type { Donation, PaginationMeta } from '../types';

type DonationStatus =
  | 'all'
  | 'failed'
  | 'refunded'
  | 'canceled'
  | 'needs_attention';

const PendingReviewSection: React.FC = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<DonationStatus>('all');
  const [fromDate, setFromDate] = useState<Dayjs | null>(null);
  const [toDate, setToDate] = useState<Dayjs | null>(null);

  const fetchDonations = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: currentPage,
        per_page: 25,
        'q[status_not_eq]': 'succeeded',
      };

      // Status filter
      if (statusFilter !== 'all') {
        params['q[status_eq]'] = statusFilter;
      }

      // Date range filters
      if (fromDate) {
        params['q[date_gteq]'] = fromDate.format('YYYY-MM-DD');
      }
      if (toDate) {
        params['q[date_lteq]'] = toDate.format('YYYY-MM-DD');
      }

      const response = await apiClient.get('/api/donations', { params });
      setDonations(response.data.donations);
      setPaginationMeta(response.data.meta);
    } catch (error) {
      console.error('Failed to fetch pending donations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, fromDate, toDate]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    page: number
  ) => {
    setCurrentPage(page);
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            id="status-filter"
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value as DonationStatus)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="refunded">Refunded</MenuItem>
            <MenuItem value="canceled">Canceled</MenuItem>
            <MenuItem value="needs_attention">Needs Attention</MenuItem>
          </Select>
        </FormControl>

        <DatePicker
          label="From Date"
          value={fromDate}
          onChange={setFromDate}
          slotProps={{ textField: { size: 'small' } }}
        />

        <DatePicker
          label="To Date"
          value={toDate}
          onChange={setToDate}
          slotProps={{ textField: { size: 'small' } }}
        />
      </Stack>

      <PendingReviewDonationList
        donations={donations}
        isLoading={isLoading}
        paginationMeta={paginationMeta}
        onPageChange={handlePageChange}
      />
    </Box>
  );
};

export default PendingReviewSection;
