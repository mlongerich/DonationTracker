import React, { useState, useEffect } from 'react';
import { Container, Typography, Card, CardContent, Box } from '@mui/material';
import apiClient from '../api/client';
import { Sponsorship, SponsorshipFormData } from '../types';
import SponsorshipList from '../components/SponsorshipList';
import SponsorshipForm from '../components/SponsorshipForm';

const SponsorshipsPage: React.FC = () => {
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [page, setPage] = useState(1);

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
    await apiClient.post('/api/sponsorships', data);
    fetchSponsorships();
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Sponsorships
      </Typography>

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
