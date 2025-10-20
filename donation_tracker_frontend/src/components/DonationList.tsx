import React, { useState } from 'react';
import Pagination from '@mui/material/Pagination';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import {
  DatePicker,
  DateValidationError,
  PickerChangeHandlerContext,
} from '@mui/x-date-pickers';
import { Dayjs } from 'dayjs';
import DonorAutocomplete, { Donor } from './DonorAutocomplete';
import { Donation, PaginationMeta } from '../types';

interface DonationListProps {
  donations: Donation[];
  paginationMeta?: PaginationMeta;
  onPageChange?: (event: React.ChangeEvent<unknown>, page: number) => void;
  onDateRangeChange?: (
    startDate: string | null,
    endDate: string | null
  ) => void;
  onDonorChange?: (donorId: number | null) => void;
}

const DonationList: React.FC<DonationListProps> = ({
  donations,
  paginationMeta,
  onPageChange,
  onDateRangeChange,
  onDonorChange,
}) => {
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);

  const validateDateRange = (
    start: Dayjs | null,
    end: Dayjs | null
  ): boolean => {
    if (start && end && start.isAfter(end)) {
      setDateError('End date must be after or equal to start date');
      return false;
    }
    setDateError(null);
    return true;
  };

  const handleStartDateChange = (
    value: Dayjs | null,
    _context: PickerChangeHandlerContext<DateValidationError>
  ) => {
    setStartDate(value);
    // Only call onChange if date is valid (not null and valid dayjs object)
    if (
      value &&
      value.isValid() &&
      validateDateRange(value, endDate) &&
      onDateRangeChange
    ) {
      onDateRangeChange(
        value.format('YYYY-MM-DD'),
        endDate && endDate.isValid() ? endDate.format('YYYY-MM-DD') : null
      );
    } else if (!value && onDateRangeChange) {
      // Handle clearing the date
      onDateRangeChange(
        null,
        endDate && endDate.isValid() ? endDate.format('YYYY-MM-DD') : null
      );
    }
  };

  const handleEndDateChange = (
    value: Dayjs | null,
    _context: PickerChangeHandlerContext<DateValidationError>
  ) => {
    setEndDate(value);
    // Only call onChange if date is valid (not null and valid dayjs object)
    if (
      value &&
      value.isValid() &&
      validateDateRange(startDate, value) &&
      onDateRangeChange
    ) {
      onDateRangeChange(
        startDate && startDate.isValid()
          ? startDate.format('YYYY-MM-DD')
          : null,
        value.format('YYYY-MM-DD')
      );
    } else if (!value && onDateRangeChange) {
      // Handle clearing the date
      onDateRangeChange(
        startDate && startDate.isValid() ? startDate.format('YYYY-MM-DD') : null,
        null
      );
    }
  };

  const handleDonorChange = (newValue: Donor | null) => {
    setSelectedDonor(newValue);
    if (onDonorChange) {
      onDonorChange(newValue ? newValue.id : null);
    }
  };

  const handleClearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setDateError(null);
    setSelectedDonor(null);
    if (onDateRangeChange) {
      onDateRangeChange(null, null);
    }
    if (onDonorChange) {
      onDonorChange(null);
    }
  };

  return (
    <div>
      <Stack spacing={2} sx={{ mb: 2 }}>
        {dateError && (
          <Alert severity="error" onClose={() => setDateError(null)}>
            {dateError}
          </Alert>
        )}
        <DonorAutocomplete
          value={selectedDonor}
          onChange={handleDonorChange}
          size="small"
        />
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={handleStartDateChange}
            slotProps={{
              textField: {
                size: 'small',
                fullWidth: true,
                error: !!dateError,
              },
            }}
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={handleEndDateChange}
            slotProps={{
              textField: {
                size: 'small',
                fullWidth: true,
                error: !!dateError,
              },
            }}
          />
          <Button
            variant="outlined"
            onClick={handleClearFilters}
            sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
          >
            Clear Filters
          </Button>
        </Stack>
      </Stack>

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
                  <Typography variant="subtitle1">
                    ${Number(donation.amount).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {donation.date} - {donation.donor_name || `Donor #${donation.donor_id}`}
                    {` - ${donation.project_title || 'General Donation'}`}
                  </Typography>
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
        </>
      )}
    </div>
  );
};

export default DonationList;
