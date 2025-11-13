import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { Donation } from '../types';
import { formatCurrency } from '../utils/currency';

interface DonationListProps {
  donations: Donation[];
}

const DonationList: React.FC<DonationListProps> = ({ donations }) => {
  const getPaymentMethodLabel = (method?: string | null) => {
    if (!method) return null;
    return method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ');
  };

  return (
    <div>
      {donations.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">No donations yet</Typography>
        </Box>
      ) : (
        <>
          <Stack spacing={2}>
            {donations.map((donation) => (
              <Card key={donation.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle1">
                      {formatCurrency(Number(donation.amount))}
                    </Typography>
                    {donation.payment_method && (
                      <Chip
                        label={getPaymentMethodLabel(donation.payment_method)}
                        size="small"
                      />
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {donation.date} -{' '}
                    {donation.donor_name || `Donor #${donation.donor_id}`}
                    {` - ${donation.project_title || 'General Donation'}`}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      )}
    </div>
  );
};

export default DonationList;
