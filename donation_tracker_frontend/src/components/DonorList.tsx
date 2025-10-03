import React from 'react';
import { Box, Typography, Card, CardContent, Stack } from '@mui/material';

interface Donor {
  id: number;
  name: string;
  email: string;
}

interface DonorListProps {
  donors: Donor[];
}

const DonorList: React.FC<DonorListProps> = ({ donors }) => {
  if (donors.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">No donors yet</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {donors.map((donor) => (
        <Card key={donor.id} variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" component="div" gutterBottom>
              {donor.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {donor.email}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};

export default DonorList;
