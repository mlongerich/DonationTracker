import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { theme } from './theme';
import DonorForm from './components/DonorForm';
import DonorList from './components/DonorList';
import DonorMergeModal from './components/DonorMergeModal';
import DonationForm from './components/DonationForm';
import DonationList from './components/DonationList';
import ProjectsPage from './pages/ProjectsPage';
import apiClient, { mergeDonors } from './api/client';
import { Donor, Donation, PaginationMeta } from './types';

function App() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    total_count: 0,
    total_pages: 0,
    current_page: 1,
    per_page: 25,
  });
  const [dateRange, setDateRange] = useState<{
    startDate: string | null;
    endDate: string | null;
  }>({
    startDate: null,
    endDate: null,
  });
  const [selectedDonorId, setSelectedDonorId] = useState<number | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1); // Reset to page 1 when search changes
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchDonors = async () => {
    try {
      const params: Record<string, unknown> = {
        page: currentPage,
        per_page: 10,
      };

      // Add Ransack search params if query exists
      if (debouncedQuery) {
        params.q = {
          name_or_email_cont: debouncedQuery,
        };
      }

      // Include archived donors if toggle is on
      if (showArchived) {
        params.include_discarded = 'true';
      }

      const response = await apiClient.get('/api/donors', { params });
      setDonors(response.data.donors);
      setPaginationMeta(response.data.meta);
    } catch (error) {
      console.error('Failed to fetch donors:', error);
    }
  };

  const fetchDonations = async () => {
    try {
      const params: Record<string, unknown> = {};

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
      setDonations(response.data.donations || []);
      if (response.data.meta) {
        setPaginationMeta(response.data.meta);
      }
    } catch (error) {
      console.error('Failed to fetch donations:', error);
    }
  };

  useEffect(() => {
    fetchDonors();
    fetchDonations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, currentPage, showArchived, dateRange, selectedDonorId]);

  const handleDonorSubmit = (data: { name: string; email: string }) => {
    console.log('Donor submitted:', data);
    fetchDonors();
    setEditingDonor(null);
  };

  const handleCancel = () => {
    setEditingDonor(null);
  };

  const handleArchive = async (id: number) => {
    try {
      await apiClient.delete(`/api/donors/${id}`);
      fetchDonors();
    } catch (error) {
      console.error('Failed to archive donor:', error);
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await apiClient.post(`/api/donors/${id}/restore`);
      fetchDonors();
    } catch (error) {
      console.error('Failed to restore donor:', error);
    }
  };

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    page: number
  ) => {
    setCurrentPage(page);
  };

  const handleMergeClick = () => {
    setShowMergeModal(true);
  };

  const handleMergeConfirm = async (fieldSelections: {
    name: number;
    email: number;
  }) => {
    try {
      await mergeDonors(selectedIds, fieldSelections);
      setSelectedIds([]);
      setShowMergeModal(false);
      fetchDonors();
    } catch (error) {
      console.error('Failed to merge donors:', error);
    }
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <BrowserRouter>
          <Routes>
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/" element={
              <Container maxWidth="sm">
                <Box sx={{ my: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                  Donation Tracker
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Link to="/projects">Manage Projects</Link>
                </Box>

                <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 3 }}>
                  Record Donation
                </Typography>
                <DonationForm onSuccess={fetchDonations} />

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Recent Donations
            </Typography>
            <DonationList
              donations={donations}
              paginationMeta={paginationMeta}
              onPageChange={(_, page) => setCurrentPage(page)}
              onDateRangeChange={handleDateRangeChange}
              onDonorChange={handleDonorFilterChange}
            />
          </Box>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              {editingDonor ? 'Edit Donor' : 'Add Donor'}
            </Typography>
            <DonorForm
              donor={editingDonor || undefined}
              onSubmit={handleDonorSubmit}
              onCancel={handleCancel}
            />
          </Box>
          <Box sx={{ mt: 4 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Typography variant="h6" component="h2">
                Donors ({paginationMeta.total_count})
              </Typography>
            </Stack>
            <TextField
              fullWidth
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ mb: 2 }}
              size="small"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                />
              }
              label="Show Archived Donors"
              sx={{ mb: 2 }}
            />
            {selectedIds.length >= 2 && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleMergeClick}
                sx={{ mb: 2 }}
              >
                Merge Selected
              </Button>
            )}
            <DonorList
              donors={donors}
              onEdit={setEditingDonor}
              editingDonorId={editingDonor?.id}
              onArchive={handleArchive}
              onRestore={handleRestore}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
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
          </Box>
          <DonorMergeModal
            open={showMergeModal}
            donors={donors.filter((d) => selectedIds.includes(d.id))}
            onClose={() => setShowMergeModal(false)}
            onConfirm={handleMergeConfirm}
          />
        </Container>
            } />
          </Routes>
        </BrowserRouter>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
