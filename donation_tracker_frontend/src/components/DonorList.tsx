import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import { shouldDisplayEmail } from '../utils/emailUtils';

interface Donor {
  id: number;
  name: string;
  email: string;
  discarded_at?: string | null;
}

interface DonorListProps {
  donors: Donor[];
  onEdit?: (donor: Donor) => void;
  editingDonorId?: number;
  onArchive?: (id: number) => void;
  onRestore?: (id: number) => void;
}

const DonorList: React.FC<DonorListProps> = ({
  donors,
  onEdit,
  editingDonorId,
  onArchive,
  onRestore,
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
        const isArchived = !!donor.discarded_at;
        return (
          <Card
            key={donor.id}
            variant="outlined"
            data-testid="donor-row"
            data-editing={isEditing}
            data-archived={isArchived}
            className={isEditing ? 'editing' : ''}
            sx={{
              borderColor: isEditing ? 'primary.main' : undefined,
              borderWidth: isEditing ? 2 : 1,
              backgroundColor: isEditing ? 'action.hover' : undefined,
              opacity: isArchived ? 0.6 : 1,
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
                <Box sx={{ flex: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="subtitle1" component="div">
                      {donor.name}
                    </Typography>
                    {isArchived && (
                      <Chip label="Archived" size="small" color="default" />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {shouldDisplayEmail(donor.email)
                      ? donor.email
                      : '(No email provided)'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {!isArchived && (
                    <>
                      <Tooltip title="Edit donor">
                        <IconButton
                          aria-label="edit"
                          size="small"
                          onClick={() => onEdit?.(donor)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Archive donor">
                        <IconButton
                          aria-label="archive"
                          size="small"
                          onClick={() => onArchive?.(donor.id)}
                        >
                          <ArchiveIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  {isArchived && (
                    <Tooltip title="Restore donor">
                      <IconButton
                        aria-label="restore"
                        size="small"
                        onClick={() => onRestore?.(donor.id)}
                      >
                        <UnarchiveIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
};

export default DonorList;
