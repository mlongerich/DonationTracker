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
import DeleteIcon from '@mui/icons-material/Delete';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { Child, Sponsorship } from '../types';
import { formatCurrency } from '../utils/currency';

interface ChildListProps {
  children: Child[];
  onEdit?: (child: Child) => void;
  onDelete?: (id: number) => void;
  onArchive?: (id: number) => void;
  onRestore?: (id: number) => void;
  onAddSponsor?: (child: Child) => void;
  sponsorships?: Map<number, Sponsorship[]>;
}

const ChildList: React.FC<ChildListProps> = ({
  children,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
  onAddSponsor,
  sponsorships,
}) => {
  const getActiveSponsors = (childId: number): Sponsorship[] => {
    const childSponsorships = sponsorships?.get(childId) || [];
    return childSponsorships.filter(s => s.active);
  };
  if (children.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">No children found</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {children.map((child) => {
        const isArchived = !!child.discarded_at;
        const activeSponsors = getActiveSponsors(child.id);
        const sponsorshipText = activeSponsors.length > 0
          ? `Sponsored by: ${activeSponsors.map(s => `${s.donor_name} (${formatCurrency(Number(s.monthly_amount))}/mo)`).join(', ')}`
          : 'No active sponsors';

        return (
          <Card
            key={child.id}
            variant="outlined"
            data-testid="child-card"
            data-archived={isArchived}
            sx={{
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
                      {child.name}
                    </Typography>
                    {isArchived && (
                      <Chip label="Archived" size="small" color="default" />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {sponsorshipText}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {!isArchived && (
                    <>
                      <Tooltip title="Edit child">
                        <IconButton
                          aria-label="edit"
                          size="small"
                          onClick={() => onEdit?.(child)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {onAddSponsor && (
                        <Tooltip title="Add sponsor for child">
                          <IconButton
                            aria-label="add sponsor"
                            size="small"
                            onClick={() => onAddSponsor(child)}
                          >
                            <PersonAddIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {child.can_be_deleted ? (
                        <Tooltip title="Delete child">
                          <IconButton
                            aria-label="delete"
                            size="small"
                            onClick={() => onDelete?.(child.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Archive child">
                          <IconButton
                            aria-label="archive"
                            size="small"
                            onClick={() => onArchive?.(child.id)}
                          >
                            <ArchiveIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </>
                  )}
                  {isArchived && (
                    <Tooltip title="Restore child">
                      <IconButton
                        aria-label="restore"
                        size="small"
                        onClick={() => onRestore?.(child.id)}
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

export default ChildList;
