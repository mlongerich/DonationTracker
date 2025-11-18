import { useEffect, useState } from 'react';
import { Typography, Box, Pagination } from '@mui/material';
import DonationForm from '../components/DonationForm';
import DonationList from '../components/DonationList';
import DonationFilters from '../components/DonationFilters';
import { usePagination, useDonations } from '../hooks';

const DonationsPage = () => {
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

  const { currentPage, handlePageChange } = usePagination();

  const { donations, paginationMeta, fetchDonations } = useDonations();

  useEffect(() => {
    fetchDonations({
      page: currentPage,
      perPage: 10,
      dateRange,
      donorId: selectedDonorId,
      paymentMethod: selectedPaymentMethod,
    });
  }, [
    currentPage,
    dateRange,
    selectedDonorId,
    selectedPaymentMethod,
    fetchDonations,
  ]);

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

  const handleDonationSuccess = () => {
    fetchDonations({
      page: currentPage,
      perPage: 10,
      dateRange,
      donorId: selectedDonorId,
      paymentMethod: selectedPaymentMethod,
    });
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
        <DonationForm onSuccess={handleDonationSuccess} />
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Recent Donations
        </Typography>
        <DonationFilters
          onDateRangeChange={handleDateRangeChange}
          onDonorChange={handleDonorFilterChange}
          onPaymentMethodChange={handlePaymentMethodFilterChange}
        />
        <DonationList donations={donations} />
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
