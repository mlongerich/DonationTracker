import { Typography, Box, TextField, FormControlLabel, Checkbox, Snackbar, Alert, Pagination } from '@mui/material';
import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Child, ChildFormData, Sponsorship } from '../types';
import ChildForm from '../components/ChildForm';
import ChildList from '../components/ChildList';
import SponsorshipModal from '../components/SponsorshipModal';
import { useDebouncedValue, usePagination } from '../hooks';

const ChildrenPage = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [sponsorships, setSponsorships] = useState<Map<number, Sponsorship[]>>(new Map());
  const [selectedChildForSponsorship, setSelectedChildForSponsorship] = useState<Child | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);

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

  useEffect(() => {
    const loadChildren = async () => {
      // Build query params - add search filter if debounced query exists
      const queryParams: Record<string, unknown> = {};
      if (debouncedQuery) {
        queryParams.q = { name_cont: debouncedQuery };
      }

      const params: {
        include_sponsorships: boolean;
        include_discarded?: string;
        page?: number;
        per_page?: number;
      } = {
        include_sponsorships: true,
        page: currentPage,
        per_page: 10,
        ...queryParams,
      };

      if (showArchived) {
        params.include_discarded = 'true';
      }

      const response = await apiClient.get('/api/children', { params });
      setChildren(response.data.children);
      setPaginationMeta(response.data.meta);

      // Build sponsorship map from nested data (no extra requests)
      const sponsorshipMap = new Map<number, Sponsorship[]>();
      response.data.children.forEach((child: Child & { sponsorships?: Sponsorship[] }) => {
        if (child.sponsorships) {
          sponsorshipMap.set(child.id, child.sponsorships);
        }
      });
      setSponsorships(sponsorshipMap);
    };
    loadChildren();
  }, [showArchived, debouncedQuery, currentPage, setPaginationMeta]);

  const handleCreate = async (data: ChildFormData) => {
    await apiClient.post('/api/children', { child: data });
    const response = await apiClient.get('/api/children', { params: undefined });
    setChildren(response.data.children);
  };

  const handleUpdate = async (data: ChildFormData) => {
    if (!editingChild) return;
    await apiClient.put(`/api/children/${editingChild.id}`, { child: data });
    setEditingChild(null);
    const response = await apiClient.get('/api/children', { params: undefined });
    setChildren(response.data.children);
  };

  const handleEdit = (child: Child) => {
    setEditingChild(child);
  };

  const handleDelete = async (id: number) => {
    await apiClient.delete(`/api/children/${id}`);
    const params: { include_sponsorships: boolean; include_discarded?: string } = {
      include_sponsorships: true
    };
    if (showArchived) {
      params.include_discarded = 'true';
    }
    const response = await apiClient.get('/api/children', { params });
    setChildren(response.data.children);

    // Rebuild sponsorship map
    const sponsorshipMap = new Map<number, Sponsorship[]>();
    response.data.children.forEach((child: Child & { sponsorships?: Sponsorship[] }) => {
      if (child.sponsorships) {
        sponsorshipMap.set(child.id, child.sponsorships);
      }
    });
    setSponsorships(sponsorshipMap);
  };

  const handleArchive = async (id: number) => {
    try {
      await apiClient.post(`/api/children/${id}/archive`);
      const params: { include_sponsorships: boolean; include_discarded?: string } = {
        include_sponsorships: true
      };
      if (showArchived) {
        params.include_discarded = 'true';
      }
      const response = await apiClient.get('/api/children', { params });
      setChildren(response.data.children);

      // Rebuild sponsorship map
      const sponsorshipMap = new Map<number, Sponsorship[]>();
      response.data.children.forEach((child: Child & { sponsorships?: Sponsorship[] }) => {
        if (child.sponsorships) {
          sponsorshipMap.set(child.id, child.sponsorships);
        }
      });
      setSponsorships(sponsorshipMap);
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 422) {
        setError(err.response.data.errors?.join(', ') || 'Failed to archive child');
      } else {
        setError('Failed to archive child');
      }
      console.error('Failed to archive child:', err);
    }
  };

  const handleRestore = async (id: number) => {
    await apiClient.post(`/api/children/${id}/restore`);
    const params: { include_sponsorships: boolean; include_discarded?: string } = {
      include_sponsorships: true
    };
    if (showArchived) {
      params.include_discarded = 'true';
    }
    const response = await apiClient.get('/api/children', { params });
    setChildren(response.data.children);

    // Rebuild sponsorship map
    const sponsorshipMap = new Map<number, Sponsorship[]>();
    response.data.children.forEach((child: Child & { sponsorships?: Sponsorship[] }) => {
      if (child.sponsorships) {
        sponsorshipMap.set(child.id, child.sponsorships);
      }
    });
    setSponsorships(sponsorshipMap);
  };

  const handleAddSponsor = (child: Child) => {
    setSelectedChildForSponsorship(child);
  };

  const handleSponsorshipSuccess = async () => {
    setSelectedChildForSponsorship(null);
    // Refetch children with sponsorships to show updated data
    const response = await apiClient.get('/api/children', {
      params: { include_sponsorships: true }
    });
    setChildren(response.data.children);

    // Rebuild sponsorship map from nested data
    const sponsorshipMap = new Map<number, Sponsorship[]>();
    response.data.children.forEach((child: Child & { sponsorships?: Sponsorship[] }) => {
      if (child.sponsorships) {
        sponsorshipMap.set(child.id, child.sponsorships);
      }
    });
    setSponsorships(sponsorshipMap);
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Children Management
      </Typography>

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
          <ChildForm
            onSubmit={handleCreate}
          />
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
        <ChildList
          children={children}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onArchive={handleArchive}
          onRestore={handleRestore}
          onAddSponsor={handleAddSponsor}
          sponsorships={sponsorships}
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

      <SponsorshipModal
        open={!!selectedChildForSponsorship}
        childId={selectedChildForSponsorship?.id || 0}
        childName={selectedChildForSponsorship?.name || ''}
        onClose={() => setSelectedChildForSponsorship(null)}
        onSuccess={handleSponsorshipSuccess}
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

export default ChildrenPage;
