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
  Pagination,
} from '@mui/material';
import { SponsorshipFormData } from '../types';
import SponsorshipList from '../components/SponsorshipList';
import SponsorshipForm from '../components/SponsorshipForm';
import { useDebouncedValue, useSponsorships } from '../hooks';
import apiClient from '../api/client';

const SponsorshipsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const [showEnded, setShowEnded] = useState(false);

  const { sponsorships, paginationMeta, fetchSponsorships, endSponsorship } =
    useSponsorships();

  useEffect(() => {
    fetchSponsorships({
      page,
      perPage: 25,
      search: debouncedQuery,
      showEnded,
    });
  }, [page, debouncedQuery, showEnded, fetchSponsorships]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, showEnded]);

  const handleEndSponsorship = async (id: number) => {
    await endSponsorship(id);
    fetchSponsorships({
      page,
      perPage: 25,
      search: debouncedQuery,
      showEnded,
    });
  };

  const handleCreateSponsorship = async (data: SponsorshipFormData) => {
    try {
      await apiClient.post('/api/sponsorships', { sponsorship: data });
      fetchSponsorships({
        page,
        perPage: 25,
        search: debouncedQuery,
        showEnded,
      });
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

      {paginationMeta && paginationMeta.total_count > 0 && (
        <Box
          sx={{
            mt: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Showing {(page - 1) * 25 + 1}-
            {Math.min(page * 25, paginationMeta.total_count)} of{' '}
            {paginationMeta.total_count} sponsorships
          </Typography>
          {paginationMeta.total_pages > 1 && (
            <Pagination
              count={paginationMeta.total_pages}
              page={page}
              onChange={(_e, value) => setPage(value)}
              color="primary"
            />
          )}
        </Box>
      )}
    </Container>
  );
};

export default SponsorshipsPage;
