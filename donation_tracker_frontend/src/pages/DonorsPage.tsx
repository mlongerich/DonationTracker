import { useEffect, useState } from 'react';
import { Typography, Box, TextField, Checkbox, FormControlLabel, Pagination, Button } from '@mui/material';
import apiClient, { mergeDonors } from '../api/client';
import DonorForm from '../components/DonorForm';
import DonorList from '../components/DonorList';
import DonorMergeModal from '../components/DonorMergeModal';
import { Donor, PaginationMeta } from '../types';

const DonorsPage = () => {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    total_count: 0,
    total_pages: 0,
    current_page: 1,
    per_page: 10,
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

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
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
  }, [debouncedQuery, currentPage, showArchived]);

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
    </Box>
  );
};

export default DonorsPage;
