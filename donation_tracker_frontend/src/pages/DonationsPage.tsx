import { useEffect, useState } from 'react';
import { Typography, Box, Pagination } from '@mui/material';
import apiClient from '../api/client';
import DonationForm from '../components/DonationForm';
import DonationList from '../components/DonationList';
import { Donation, PaginationMeta } from '../types';

const DonationsPage = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    total_count: 0,
    total_pages: 0,
    current_page: 1,
    per_page: 10,
  });
  const [dateRange, setDateRange] = useState<{
    startDate: string | null;
    endDate: string | null;
  }>({
    startDate: null,
    endDate: null,
  });
  const [selectedDonorId, setSelectedDonorId] = useState<number | null>(null);

  const fetchDonations = async () => {
    try {
      const params: Record<string, unknown> = {
        page: currentPage,
        per_page: 10,
      };

      // Add Ransack filters if any are selected
      if (dateRange.startDate || dateRange.endDate || selectedDonorId) {
        const q: Record<string, string | number> = {};
        if (dateRange.startDate) {
          q.date_gteq = dateRange.startDate;
        }
        if (dateRange.endDate) {
          q.date_lteq = dateRange.endDate;
        }
        if (selectedDonorId) {
          q.donor_id_eq = selectedDonorId;
        }
        params.q = q;
      }

      const response = await apiClient.get('/api/donations', { params });
      setDonations(response.data.donations);
      setPaginationMeta(response.data.meta);
    } catch (error) {
      console.error('Failed to fetch donations:', error);
    }
  };

  useEffect(() => {
    fetchDonations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, dateRange, selectedDonorId]);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };

  const handleDateRangeChange = (
    startDate: string | null,
    endDate: string | null
  ) => {
    setDateRange({ startDate, endDate });
  };

  const handleDonorFilterChange = (donorId: number | null) => {
    setSelectedDonorId(donorId);
    setCurrentPage(1); // Reset to page 1 when donor filter changes
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
        />
      </Box>
      {paginationMeta.total_pages > 1 && (
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
