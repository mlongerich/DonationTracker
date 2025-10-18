import React, { useState, useEffect } from 'react';
import Pagination from '@mui/material/Pagination';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Dayjs } from 'dayjs';
import apiClient from '../api/client';
import { shouldDisplayEmail } from '../utils/emailUtils';

interface Donor {
  id: number;
  name: string;
  email: string;
}

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
  const [donorOptions, setDonorOptions] = useState<Donor[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Debounced search for donors
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchInput.trim()) {
        setLoading(true);
        try {
          const response = await apiClient.get('/api/donors', {
            params: {
              q: { name_or_email_cont: searchInput },
              per_page: 10,
            },
          });
          setDonorOptions(response.data.donors || []);
        } catch (error) {
          console.error('Failed to search donors:', error);
          setDonorOptions([]);
        } finally {
          setLoading(false);
        }
      } else {
        setDonorOptions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

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

  const handleStartDateChange = (value: Dayjs | null) => {
    setStartDate(value);
    // Only call onChange if date is valid (not null and valid dayjs object)
    if (value && value.isValid() && validateDateRange(value, endDate) && onDateRangeChange) {
      onDateRangeChange(
        value.format('YYYY-MM-DD'),
        endDate && endDate.isValid() ? endDate.format('YYYY-MM-DD') : null
      );
    } else if (!value && onDateRangeChange) {
      // Handle clearing the date
      onDateRangeChange(null, endDate && endDate.isValid() ? endDate.format('YYYY-MM-DD') : null);
    }
  };

  const handleEndDateChange = (value: Dayjs | null) => {
    setEndDate(value);
    // Only call onChange if date is valid (not null and valid dayjs object)
    if (value && value.isValid() && validateDateRange(startDate, value) && onDateRangeChange) {
      onDateRangeChange(
        startDate && startDate.isValid() ? startDate.format('YYYY-MM-DD') : null,
        value.format('YYYY-MM-DD')
      );
    } else if (!value && onDateRangeChange) {
      // Handle clearing the date
      onDateRangeChange(startDate && startDate.isValid() ? startDate.format('YYYY-MM-DD') : null, null);
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
    setSearchInput('');
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
        <Autocomplete
          options={donorOptions}
          loading={loading}
          value={selectedDonor}
          onChange={(_, newValue) => handleDonorChange(newValue)}
          inputValue={searchInput}
          onInputChange={(_, newInputValue) => setSearchInput(newInputValue)}
          getOptionLabel={(option) => {
            if (shouldDisplayEmail(option.email)) {
              return `${option.name} (${option.email})`;
            }
            return `${option.name} (No email provided)`;
          }}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Donor"
              size="small"
              slotProps={{
                input: {
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                },
              }}
            />
          )}
          noOptionsText={
            searchInput ? 'No donors found' : 'Start typing to search donors'
          }
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
        <div>No donations yet.</div>
      ) : (
        <>
          <ul>
            {donations.map((donation) => (
              <li key={donation.id}>
                ${Number(donation.amount).toFixed(2)} on {donation.date} -{' '}
                {donation.donor_name || `Donor #${donation.donor_id}`}
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
        </>
      )}
    </div>
  );
};

export default DonationList;
