import React, { useState } from 'react';
import {
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Dayjs } from 'dayjs';
import DonorAutocomplete, { Donor } from './DonorAutocomplete';

interface DonationFiltersProps {
  onDateRangeChange?: (
    startDate: string | null,
    endDate: string | null
  ) => void;
  onDonorChange?: (donorId: number | null) => void;
  onPaymentMethodChange?: (paymentMethod: string | null) => void;
}

const DonationFilters: React.FC<DonationFiltersProps> = ({
  onDateRangeChange,
  onDonorChange,
  onPaymentMethodChange,
}) => {
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('');

  const handleDonorChange = (newValue: Donor | null) => {
    setSelectedDonor(newValue);
    if (onDonorChange) {
      onDonorChange(newValue ? newValue.id : null);
    }
  };

  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethodFilter(value);
    if (onPaymentMethodChange) {
      onPaymentMethodChange(value || null);
    }
  };

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
      onDateRangeChange(
        null,
        endDate && endDate.isValid() ? endDate.format('YYYY-MM-DD') : null
      );
    }
  };

  const handleEndDateChange = (value: Dayjs | null) => {
    setEndDate(value);
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
      onDateRangeChange(
        startDate && startDate.isValid()
          ? startDate.format('YYYY-MM-DD')
          : null,
        null
      );
    }
  };

  const handleClearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setDateError(null);
    setSelectedDonor(null);
    setPaymentMethodFilter('');
    if (onDateRangeChange) {
      onDateRangeChange(null, null);
    }
    if (onDonorChange) {
      onDonorChange(null);
    }
    if (onPaymentMethodChange) {
      onPaymentMethodChange(null);
    }
  };

  return (
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
      <FormControl fullWidth size="small">
        <InputLabel id="payment-method-filter-label">
          Filter by Payment Method
        </InputLabel>
        <Select
          labelId="payment-method-filter-label"
          label="Filter by Payment Method"
          value={paymentMethodFilter}
          onChange={(e) => handlePaymentMethodChange(e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="stripe">Stripe</MenuItem>
          <MenuItem value="check">Check</MenuItem>
          <MenuItem value="cash">Cash</MenuItem>
          <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
        </Select>
      </FormControl>
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
  );
};

export default DonationFilters;
