import React from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Pagination,
  Stack,
  Typography,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import { Donation, PaginationMeta } from '../types';
import { formatCurrency } from '../utils/currency';

interface Props {
  donations: Donation[];
  isLoading: boolean;
  paginationMeta: PaginationMeta | null;
  onPageChange: (event: React.ChangeEvent<unknown>, page: number) => void;
}

const PendingReviewDonationList: React.FC<Props> = ({
  donations,
  isLoading,
  paginationMeta,
  onPageChange,
}) => {
  const getStatusColor = (
    status: string
  ): 'error' | 'warning' | 'default' | 'info' => {
    switch (status) {
      case 'failed':
        return 'error';
      case 'refunded':
        return 'warning';
      case 'canceled':
        return 'default';
      case 'needs_attention':
        return 'info';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (donations.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          No donations need attention
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack spacing={2}>
        {donations.map((donation) => (
          <Card key={donation.id} variant="outlined">
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="start"
              >
                <Box>
                  <Typography variant="h6">
                    {donation.donor_name || 'Unknown Donor'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {donation.date}
                  </Typography>

                  {donation.duplicate_subscription_detected && (
                    <Alert
                      severity="warning"
                      icon={<WarningIcon />}
                      sx={{ mt: 1 }}
                    >
                      Duplicate subscription detected
                    </Alert>
                  )}

                  {donation.needs_attention_reason && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      Reason: {donation.needs_attention_reason}
                    </Typography>
                  )}
                </Box>
                <Stack alignItems="flex-end" spacing={1}>
                  <Typography variant="h6">
                    {formatCurrency(Number(donation.amount))}
                  </Typography>
                  <Chip
                    label={donation.status.toUpperCase().replace('_', ' ')}
                    color={getStatusColor(donation.status)}
                    size="small"
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {paginationMeta && paginationMeta.total_pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={paginationMeta.total_pages}
            page={paginationMeta.current_page}
            onChange={onPageChange}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
};

export default PendingReviewDonationList;
