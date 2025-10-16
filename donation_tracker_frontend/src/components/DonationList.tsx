import React from 'react';
import Pagination from '@mui/material/Pagination';
import Box from '@mui/material/Box';

interface Donation {
  id: number;
  amount: string;
  date: string;
  donor_id: number;
  donor_name?: string;
}

interface PaginationMeta {
  total_count: number;
  total_pages: number;
  current_page: number;
  per_page: number;
}

interface DonationListProps {
  donations: Donation[];
  paginationMeta?: PaginationMeta;
  onPageChange?: (event: React.ChangeEvent<unknown>, page: number) => void;
}

const DonationList: React.FC<DonationListProps> = ({
  donations,
  paginationMeta,
  onPageChange
}) => {
  if (donations.length === 0) {
    return <div>No donations yet.</div>;
  }

  return (
    <div>
      <ul>
        {donations.map((donation) => (
          <li key={donation.id}>
            ${donation.amount} on {donation.date} - {donation.donor_name || `Donor #${donation.donor_id}`}
          </li>
        ))}
      </ul>

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
    </div>
  );
};

export default DonationList;
