import { Typography, Box, Button, FormControlLabel, Checkbox, Snackbar, Alert } from '@mui/material';
import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Child, ChildFormData, Sponsorship } from '../types';
import ChildForm from '../components/ChildForm';
import ChildList from '../components/ChildList';
import SponsorshipModal from '../components/SponsorshipModal';

const ChildrenPage = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [sponsorships, setSponsorships] = useState<Map<number, Sponsorship[]>>(new Map());
  const [selectedChildForSponsorship, setSelectedChildForSponsorship] = useState<Child | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadChildren = async () => {
      const params: { include_sponsorships: boolean; include_discarded?: string } = {
        include_sponsorships: true
      };
      if (showArchived) {
        params.include_discarded = 'true';
      }

      const response = await apiClient.get('/api/children', { params });
      setChildren(response.data.children);

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
  }, [showArchived]);

  const handleCreate = async (data: ChildFormData) => {
    await apiClient.post('/api/children', { child: data });
    setShowForm(false);
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
    setShowForm(false);
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
        {!showForm && !editingChild && (
          <Button variant="contained" onClick={() => setShowForm(true)}>
            Add Child
          </Button>
        )}
        {showForm && (
          <ChildForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        )}
        {editingChild && (
          <ChildForm
            onSubmit={handleUpdate}
            onCancel={() => setEditingChild(null)}
            initialData={{ name: editingChild.name }}
          />
        )}
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          List Children
        </Typography>
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
