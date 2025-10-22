import { List, ListItem, ListItemText, IconButton, Stack, Typography, Button } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Child, Sponsorship } from '../types';

interface ChildListProps {
  children: Child[];
  onEdit: (child: Child) => void;
  onDelete: (id: number) => void;
  sponsorships?: Map<number, Sponsorship[]>;
  onAddSponsor?: (child: Child) => void;
}

const ChildList: React.FC<ChildListProps> = ({ children, onEdit, onDelete, sponsorships, onAddSponsor }) => {
  if (children.length === 0) {
    return <Typography variant="body1" color="text.secondary">No children found</Typography>;
  }

  const getActiveSponsor = (childId: number): Sponsorship | null => {
    const childSponsorships = sponsorships?.get(childId) || [];
    return childSponsorships.find(s => s.active) || null;
  };

  return (
    <List>
      {children.map((child) => {
        const activeSponsor = getActiveSponsor(child.id);
        const secondaryText = activeSponsor
          ? `Sponsored by ${activeSponsor.donor_name} ($${parseFloat(activeSponsor.monthly_amount)}/month)`
          : 'No active sponsor';

        return (
          <ListItem
            key={child.id}
            secondaryAction={
              <Stack direction="row" spacing={1}>
                {!activeSponsor && onAddSponsor && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => onAddSponsor(child)}
                  >
                    Add Sponsor
                  </Button>
                )}
                <IconButton edge="end" aria-label="edit" onClick={() => onEdit(child)}>
                  <EditIcon />
                </IconButton>
                <IconButton edge="end" aria-label="delete" onClick={() => onDelete(child.id)}>
                  <DeleteIcon />
                </IconButton>
              </Stack>
            }
          >
            <ListItemText primary={child.name} secondary={secondaryText} />
          </ListItem>
        );
      })}
    </List>
  );
};

export default ChildList;
