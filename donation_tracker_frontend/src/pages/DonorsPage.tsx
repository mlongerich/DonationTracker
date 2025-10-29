import { useEffect, useState } from 'react';
import { Typography, Box, TextField, Checkbox, FormControlLabel, Pagination, Button, Alert, Snackbar } from '@mui/material';
import apiClient, { mergeDonors } from '../api/client';
import DonorForm from '../components/DonorForm';
import DonorList from '../components/DonorList';
import DonorMergeModal from '../components/DonorMergeModal';
import { Donor } from '../types';
import { useDebouncedValue, usePagination } from '../hooks';

const DonorsPage = () => {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    currentPage,
    paginationMeta,
    setPaginationMeta,
    handlePageChange,
    resetToFirstPage,
  } = usePagination();

  // Reset to page 1 when search changes
  useEffect(() => {
    resetToFirstPage();
  }, [debouncedQuery, resetToFirstPage]);

  const fetchDonors = async () => {
    try {
      // Build query params - add search filter if debounced query exists
      const queryParams: Record<string, unknown> = {};
      if (debouncedQuery) {
        queryParams.q = { name_or_email_cont: debouncedQuery };
      }

      const params: Record<string, unknown> = {
        page: currentPage,
        per_page: 10,
        ...queryParams,
      };

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

  const handleArchive = async (id: number) => {
    try {
      await apiClient.delete(`/api/donors/${id}`);
      fetchDonors();
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 422) {
        setError(err.response.data.errors?.join(', ') || 'Failed to archive donor');
      } else {
        setError('Failed to archive donor');
      }
      console.error('Failed to archive donor:', err);
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

  const handleDonorSubmit = () => {
    fetchDonors();
    setEditingDonor(null);
  };

  const handleCancel = () => {
    setEditingDonor(null);
  };

  useEffect(() => {
    fetchDonors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, showArchived, debouncedQuery]);

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Donor Management
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          {editingDonor ? 'Edit Donor' : 'Add Donor'}
        </Typography>
        <DonorForm
          donor={editingDonor || undefined}
          onSubmit={handleDonorSubmit}
          onCancel={handleCancel}
        />
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          List Donors
        </Typography>
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
            onClick={() => setShowMergeModal(true)}
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
      <DonorMergeModal
        open={showMergeModal}
        donors={donors.filter((d) => selectedIds.includes(d.id))}
        onClose={() => setShowMergeModal(false)}
        onConfirm={async (fieldSelections) => {
          await mergeDonors(selectedIds, fieldSelections);
          setSelectedIds([]);
          setShowMergeModal(false);
          fetchDonors();
        }}
      />
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DonorsPage;
