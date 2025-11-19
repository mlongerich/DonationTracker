import { useEffect, useState } from 'react';
import {
  Typography,
  Box,
  TextField,
  Checkbox,
  FormControlLabel,
  Pagination,
  Button,
  Alert,
  Snackbar,
} from '@mui/material';
import apiClient, { mergeDonors } from '../api/client';
import DonorForm from '../components/DonorForm';
import DonorList from '../components/DonorList';
import DonorMergeModal from '../components/DonorMergeModal';
import { Donor, DonorFormData } from '../types';
import { useDebouncedValue, usePagination, useDonors } from '../hooks';

const DonorsPage = () => {
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const { currentPage, handlePageChange, resetToFirstPage } = usePagination();

  const { donors, paginationMeta, fetchDonors, archiveDonor, restoreDonor } =
    useDonors();

  // Reset to page 1 when search changes
  useEffect(() => {
    resetToFirstPage();
  }, [debouncedQuery, resetToFirstPage]);

  const handleArchive = async (id: number) => {
    const result = await archiveDonor(id);
    if (result.success) {
      fetchDonors({
        page: currentPage,
        perPage: 10,
        search: debouncedQuery,
        includeDiscarded: showArchived,
      });
      setError(null);
    } else {
      setError(result.error || 'Failed to archive donor');
    }
  };

  const handleRestore = async (id: number) => {
    const result = await restoreDonor(id);
    if (result.success) {
      fetchDonors({
        page: currentPage,
        perPage: 10,
        search: debouncedQuery,
        includeDiscarded: showArchived,
      });
    }
  };

  const handleDonorSubmit = async (data: DonorFormData) => {
    try {
      if (editingDonor) {
        // Update existing donor
        await apiClient.patch(`/api/donors/${editingDonor.id}`, {
          donor: data,
        });
        console.log('Setting success message: Donor updated successfully!');
        setSuccessMessage('Donor updated successfully!');
        setEditingDonor(null);
      } else {
        // Create new donor
        await apiClient.post('/api/donors', {
          donor: data,
        });
        console.log('Setting success message: Donor created successfully!');
        setSuccessMessage('Donor created successfully!');
        setFormKey((prev) => prev + 1); // Reset form after create
      }

      setError(null);

      // Refresh donor list after state updates
      await fetchDonors({
        page: currentPage,
        perPage: 10,
        search: debouncedQuery,
        includeDiscarded: showArchived,
      });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.errors?.[0] ||
        `Failed to ${editingDonor ? 'update' : 'create'} donor`;
      console.error('Donor submit error:', errorMessage, err);
      setError(errorMessage);
    }
  };

  const handleCancel = () => {
    setEditingDonor(null);
  };

  useEffect(() => {
    fetchDonors({
      page: currentPage,
      perPage: 10,
      search: debouncedQuery,
      includeDiscarded: showArchived,
    });
  }, [currentPage, debouncedQuery, showArchived, fetchDonors]);

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
          key={editingDonor?.id || formKey}
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
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        data-testid="success-snackbar"
      >
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DonorsPage;
