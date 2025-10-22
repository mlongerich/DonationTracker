import { Typography, Box, Button } from '@mui/material';
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

  useEffect(() => {
    const loadChildren = async () => {
      const response = await apiClient.get('/api/children', { params: undefined });
      setChildren(response.data.children);

      // Fetch sponsorships for each child
      const sponsorshipMap = new Map<number, Sponsorship[]>();
      for (const child of response.data.children) {
        const sponsorshipResponse = await apiClient.get(`/api/children/${child.id}/sponsorships`);
        sponsorshipMap.set(child.id, sponsorshipResponse.data.sponsorships);
      }
      setSponsorships(sponsorshipMap);
    };
    loadChildren();
  }, []);

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
    const response = await apiClient.get('/api/children', { params: undefined });
    setChildren(response.data.children);
  };

  const handleAddSponsor = (child: Child) => {
    setSelectedChildForSponsorship(child);
  };

  const handleSponsorshipSuccess = async () => {
    setSelectedChildForSponsorship(null);
    // Refetch sponsorships to show updated data
    const sponsorshipMap = new Map<number, Sponsorship[]>();
    for (const child of children) {
      const sponsorshipResponse = await apiClient.get(`/api/children/${child.id}/sponsorships`);
      sponsorshipMap.set(child.id, sponsorshipResponse.data.sponsorships);
    }
    setSponsorships(sponsorshipMap);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Children Management
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

      <ChildList
        children={children}
        onEdit={handleEdit}
        onDelete={handleDelete}
        sponsorships={sponsorships}
        onAddSponsor={handleAddSponsor}
      />

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
