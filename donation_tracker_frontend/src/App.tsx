import { useEffect, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import { theme } from './theme';
import DonorForm from './components/DonorForm';
import DonorList from './components/DonorList';
import apiClient from './api/client';

interface Donor {
  id: number;
  name: string;
  email: string;
}

interface PaginationMeta {
  total_count: number;
  total_pages: number;
  current_page: number;
  per_page: number;
}

function App() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    total_count: 0,
    total_pages: 0,
    current_page: 1,
    per_page: 25,
  });

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

      const response = await apiClient.get('/api/donors', { params });
      setDonors(response.data.donors);
      setPaginationMeta(response.data.meta);
    } catch (error) {
      console.error('Failed to fetch donors:', error);
    }
  };

  useEffect(() => {
    fetchDonors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, currentPage]);

  const handleDonorSubmit = (data: { name: string; email: string }) => {
    console.log('Donor submitted:', data);
    fetchDonors();
    setEditingDonor(null);
  };

  const handleCancel = () => {
    setEditingDonor(null);
  };

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    page: number
  ) => {
    setCurrentPage(page);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="sm">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Donation Tracker
          </Typography>
          <Typography variant="h6" component="h2" gutterBottom>
            {editingDonor ? 'Edit Donor' : 'Add Donor'}
          </Typography>
          <DonorForm
            donor={editingDonor || undefined}
            onSubmit={handleDonorSubmit}
            onCancel={handleCancel}
          />
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
            <DonorList
              donors={donors}
              onEdit={setEditingDonor}
              editingDonorId={editingDonor?.id}
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
      </Container>
    </ThemeProvider>
  );
}

export default App;
