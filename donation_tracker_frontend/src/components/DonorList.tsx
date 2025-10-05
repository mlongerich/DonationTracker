import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

interface Donor {
  id: number;
  name: string;
  email: string;
}

interface DonorListProps {
  donors: Donor[];
  onEdit?: (donor: Donor) => void;
  editingDonorId?: number;
}

const DonorList: React.FC<DonorListProps> = ({
  donors,
  onEdit,
  editingDonorId,
}) => {
  if (donors.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">No donors yet</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {donors.map((donor) => {
        const isEditing = editingDonorId === donor.id;
        return (
          <Card
            key={donor.id}
            variant="outlined"
            data-editing={isEditing}
            sx={{
              borderColor: isEditing ? 'primary.main' : undefined,
              borderWidth: isEditing ? 2 : 1,
              backgroundColor: isEditing ? 'action.hover' : undefined,
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                }}
              >
                <Box>
                  <Typography variant="subtitle1" component="div" gutterBottom>
                    {donor.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {donor.email}
                  </Typography>
                </Box>
                <IconButton
                  aria-label="edit"
                  size="small"
                  onClick={() => onEdit?.(donor)}
                >
                  <EditIcon />
                </IconButton>
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
};

export default DonorList;
