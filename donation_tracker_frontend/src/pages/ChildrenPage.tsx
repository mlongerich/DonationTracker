import {
  Typography,
  Box,
  TextField,
  FormControlLabel,
  Checkbox,
  Alert,
  Pagination,
  CircularProgress,
} from '@mui/material';
import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Child, ChildFormData } from '../types';
import ChildForm from '../components/ChildForm';
import ChildList from '../components/ChildList';
import SponsorshipModal from '../components/SponsorshipModal';
import { useDebouncedValue, usePagination, useChildren } from '../hooks';

const ChildrenPage = () => {
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [selectedChildForSponsorship, setSelectedChildForSponsorship] =
    useState<Child | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  const { currentPage, handlePageChange, resetToFirstPage } = usePagination();

  const {
    children,
    sponsorships,
    loading,
    error: fetchError,
    paginationMeta,
    fetchChildren,
  } = useChildren();

  // Reset to page 1 when search changes
  useEffect(() => {
    resetToFirstPage();
  }, [debouncedQuery, resetToFirstPage]);

  useEffect(() => {
    fetchChildren({
      includeSponsorship: true,
      includeDiscarded: showArchived,
      page: currentPage,
      perPage: 10,
      search: debouncedQuery,
    });
  }, [showArchived, debouncedQuery, currentPage, fetchChildren]);

  const refetchWithCurrentFilters = () => {
    fetchChildren({
      includeSponsorship: true,
      includeDiscarded: showArchived,
      page: currentPage,
      perPage: 10,
      search: debouncedQuery,
    });
  };

  const handleCreate = async (data: ChildFormData) => {
    await apiClient.post('/api/children', { child: data });
    refetchWithCurrentFilters();
  };

  const handleUpdate = async (data: ChildFormData) => {
    if (!editingChild) return;
    await apiClient.put(`/api/children/${editingChild.id}`, { child: data });
    setEditingChild(null);
    refetchWithCurrentFilters();
  };

  const handleEdit = (child: Child) => {
    setEditingChild(child);
  };

  const handleDelete = async (id: number) => {
    await apiClient.delete(`/api/children/${id}`);
    refetchWithCurrentFilters();
  };

  const handleArchive = async (id: number) => {
    try {
      await apiClient.post(`/api/children/${id}/archive`);
      refetchWithCurrentFilters();
      setLocalError(null);
    } catch (err: any) {
      if (err.response?.status === 422) {
        setLocalError(
          err.response.data.errors?.join(', ') || 'Failed to archive child'
        );
      } else {
        setLocalError('Failed to archive child');
      }
      console.error('Failed to archive child:', err);
    }
  };

  const handleRestore = async (id: number) => {
    await apiClient.post(`/api/children/${id}/restore`);
    refetchWithCurrentFilters();
  };

  const handleAddSponsor = (child: Child) => {
    setSelectedChildForSponsorship(child);
  };

  const handleSponsorshipSuccess = async () => {
    setSelectedChildForSponsorship(null);
    refetchWithCurrentFilters();
  };

  const displayError = localError || fetchError;

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Children Management
      </Typography>

      {displayError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setLocalError(null)}
        >
          {displayError}
        </Alert>
      )}

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          {editingChild ? 'Edit Child' : 'Add Child'}
        </Typography>
        {editingChild ? (
          <ChildForm
            onSubmit={handleUpdate}
            initialData={{ name: editingChild.name }}
          />
        ) : (
          <ChildForm onSubmit={handleCreate} />
        )}
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          List Children
        </Typography>
        <TextField
          fullWidth
          placeholder="Search by name..."
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
          label="Show Archived Children"
          sx={{ mb: 2 }}
        />

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && (
          <ChildList
            children={children}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onArchive={handleArchive}
            onRestore={handleRestore}
            onAddSponsor={handleAddSponsor}
            sponsorships={sponsorships}
          />
        )}
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

      <SponsorshipModal
        open={!!selectedChildForSponsorship}
        childId={selectedChildForSponsorship?.id || 0}
        childName={selectedChildForSponsorship?.name || ''}
        onClose={() => setSelectedChildForSponsorship(null)}
        onSuccess={handleSponsorshipSuccess}
      />
    </Box>
  );
};

export default ChildrenPage;
