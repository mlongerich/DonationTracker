import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Alert,
  TextField,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import apiClient from '../api/client';
import { Sponsorship, SponsorshipFormData } from '../types';
import SponsorshipList from '../components/SponsorshipList';
import SponsorshipForm from '../components/SponsorshipForm';
import { useDebouncedValue } from '../hooks';

const SponsorshipsPage: React.FC = () => {
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const [showEnded, setShowEnded] = useState(false);

  useEffect(() => {
    fetchSponsorships();
  }, [page, debouncedQuery, showEnded]);

  const fetchSponsorships = async () => {
    const params: any = { page, per_page: 25 };

    if (debouncedQuery.trim()) {
      params.q = { ...params.q, donor_name_or_child_name_cont: debouncedQuery };
    }
    if (!showEnded) {
      params.q = { ...params.q, end_date_null: true };
    }

    const response = await apiClient.get('/api/sponsorships', { params });
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
        const errorMsg =
          err.response.data.errors?.base?.[0] ||
          'This sponsorship already exists';
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

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search donor or child name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 2 }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={showEnded}
              onChange={(e) => setShowEnded(e.target.checked)}
            />
          }
          label="Show Ended Sponsorships"
        />
      </Box>

      <SponsorshipList
        sponsorships={sponsorships}
        onEndSponsorship={handleEndSponsorship}
      />
    </Container>
  );
};

export default SponsorshipsPage;
