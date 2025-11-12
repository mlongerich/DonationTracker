import { useEffect, useState } from 'react';
import { Typography, Box, Pagination } from '@mui/material';
import apiClient from '../api/client';
import DonationForm from '../components/DonationForm';
import DonationList from '../components/DonationList';
import { Donation } from '../types';
import { usePagination } from '../hooks';

const DonationsPage = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [dateRange, setDateRange] = useState<{
    startDate: string | null;
    endDate: string | null;
  }>({
    startDate: null,
    endDate: null,
  });
  const [selectedDonorId, setSelectedDonorId] = useState<number | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    string | null
  >(null);

  const { currentPage, paginationMeta, setPaginationMeta, handlePageChange } =
    usePagination();

  const fetchDonations = async () => {
    try {
      // Build query params directly from state to avoid race condition (TICKET-078)
      const queryParams: Record<string, unknown> = {};

      if (dateRange.startDate) {
        queryParams['q[date_gteq]'] = dateRange.startDate;
      }
      if (dateRange.endDate) {
        queryParams['q[date_lteq]'] = dateRange.endDate;
      }
      if (selectedDonorId) {
        queryParams['q[donor_id_eq]'] = selectedDonorId;
      }
      if (selectedPaymentMethod) {
        queryParams['q[payment_method_eq]'] = selectedPaymentMethod;
      }

      const params: Record<string, unknown> = {
        page: currentPage,
        per_page: 10,
        ...queryParams,
      };

      const response = await apiClient.get('/api/donations', { params });
      setDonations(response.data.donations);
      setPaginationMeta(response.data.meta);
    } catch (error) {
      // Error silently handled - user will see empty list
    }
  };

  useEffect(() => {
    fetchDonations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, dateRange, selectedDonorId, selectedPaymentMethod]);

  const handleDateRangeChange = (
    startDate: string | null,
    endDate: string | null
  ) => {
    setDateRange({ startDate, endDate });
  };

  const handleDonorFilterChange = (donorId: number | null) => {
    setSelectedDonorId(donorId);
  };

  const handlePaymentMethodFilterChange = (paymentMethod: string | null) => {
    setSelectedPaymentMethod(paymentMethod);
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Donation Management
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Record Donation
        </Typography>
        <DonationForm onSuccess={fetchDonations} />
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Recent Donations
        </Typography>
        <DonationList
          donations={donations}
          onDateRangeChange={handleDateRangeChange}
          onDonorChange={handleDonorFilterChange}
          onPaymentMethodChange={handlePaymentMethodFilterChange}
        />
      </Box>
      {paginationMeta && paginationMeta.total_pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={paginationMeta.total_pages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
};

export default DonationsPage;
