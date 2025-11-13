import React, { useState } from 'react';
import { Stack, Select, MenuItem, FormControl, InputLabel, Button } from '@mui/material';
import {
  DatePicker,
  DateValidationError,
  PickerChangeHandlerContext,
} from '@mui/x-date-pickers';
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

  const handleStartDateChange = (
    value: Dayjs | null,
    _context: PickerChangeHandlerContext<DateValidationError>
  ) => {
    setStartDate(value);
    if (onDateRangeChange) {
      const formattedStart =
        value && value.isValid() ? value.format('YYYY-MM-DD') : null;
      const formattedEnd =
        endDate && endDate.isValid() ? endDate.format('YYYY-MM-DD') : null;
      onDateRangeChange(formattedStart, formattedEnd);
    }
  };

  const handleEndDateChange = (
    value: Dayjs | null,
    _context: PickerChangeHandlerContext<DateValidationError>
  ) => {
    setEndDate(value);
    if (onDateRangeChange) {
      const formattedStart =
        startDate && startDate.isValid() ? startDate.format('YYYY-MM-DD') : null;
      const formattedEnd =
        value && value.isValid() ? value.format('YYYY-MM-DD') : null;
      onDateRangeChange(formattedStart, formattedEnd);
    }
  };

  const handleClearFilters = () => {
    setStartDate(null);
    setEndDate(null);
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
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <DatePicker
          label="Start Date"
          value={startDate}
          onChange={handleStartDateChange}
          slotProps={{
            textField: {
              size: 'small',
              fullWidth: true,
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
