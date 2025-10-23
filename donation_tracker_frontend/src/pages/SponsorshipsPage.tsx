import React, { useState, useEffect } from 'react';
import { Container, Typography, Card, CardContent, Box, Alert } from '@mui/material';
import apiClient from '../api/client';
import { Sponsorship, SponsorshipFormData } from '../types';
import SponsorshipList from '../components/SponsorshipList';
import SponsorshipForm from '../components/SponsorshipForm';

const SponsorshipsPage: React.FC = () => {
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSponsorships();
  }, [page]);

  const fetchSponsorships = async () => {
    const response = await apiClient.get('/api/sponsorships', {
      params: { page, per_page: 25 },
    });
    setSponsorships(response.data.sponsorships);
  };

  const handleEndSponsorship = async (id: number) => {
    await apiClient.delete(`/api/sponsorships/${id}`);
    fetchSponsorships();
  };

  const handleCreateSponsorship = async (data: SponsorshipFormData) => {
    try {
      await apiClient.post('/api/sponsorships', { sponsorship: data });
      fetchSponsorships();
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 422) {
        const errorMsg = err.response.data.errors?.base?.[0]
          || 'This sponsorship already exists';
        setError(errorMsg);
      } else {
        setError('Failed to create sponsorship');
      }
      console.error('Failed to create sponsorship:', err);
    }
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Sponsorships
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" component="h2" gutterBottom>
            Create New Sponsorship
          </Typography>
          <SponsorshipForm
            onSubmit={handleCreateSponsorship}
            onCancel={() => {}}
            childId={undefined}
          />
        </CardContent>
      </Card>

      <SponsorshipList
        sponsorships={sponsorships}
        onEndSponsorship={handleEndSponsorship}
      />
    </Container>
  );
};

export default SponsorshipsPage;
