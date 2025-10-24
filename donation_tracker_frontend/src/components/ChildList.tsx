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

  const getActiveSponsors = (childId: number): Sponsorship[] => {
    const childSponsorships = sponsorships?.get(childId) || [];
    return childSponsorships.filter(s => s.active);
  };

  return (
    <List>
      {children.map((child) => {
        const activeSponsors = getActiveSponsors(child.id);
        const secondaryText = activeSponsors.length > 0
          ? `Sponsored by: ${activeSponsors.map(s => `${s.donor_name} ($${parseFloat(s.monthly_amount)}/mo)`).join(', ')}`
          : 'No active sponsors';

        return (
          <ListItem
            key={child.id}
            secondaryAction={
              <Stack direction="row" spacing={1}>
                {activeSponsors.length === 0 && onAddSponsor && (
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
