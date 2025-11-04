import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Typography,
} from '@mui/material';
import { Sponsorship } from '../types';
import { formatCurrency } from '../utils/currency';

interface SponsorshipListProps {
  sponsorships: Sponsorship[];
  onEndSponsorship: (id: number) => void;
}

const SponsorshipList: React.FC<SponsorshipListProps> = ({
  sponsorships,
  onEndSponsorship,
}) => {
  if (sponsorships.length === 0) {
    return (
      <Typography variant="body1" color="text.secondary">
        No sponsorships found
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Donor</TableCell>
            <TableCell>Child</TableCell>
            <TableCell>Monthly Amount</TableCell>
            <TableCell>Start Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sponsorships.map((sponsorship) => (
            <TableRow key={sponsorship.id}>
              <TableCell>{sponsorship.donor_name}</TableCell>
              <TableCell>{sponsorship.child_name}</TableCell>
              <TableCell>
                {formatCurrency(Number(sponsorship.monthly_amount))}
              </TableCell>
              <TableCell>{sponsorship.start_date || 'Not set'}</TableCell>
              <TableCell>{sponsorship.active ? 'Active' : 'Ended'}</TableCell>
              <TableCell>
                {sponsorship.active && (
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={() => onEndSponsorship(sponsorship.id)}
                  >
                    End
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SponsorshipList;
