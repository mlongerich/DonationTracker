import React, { useState } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { createDonation } from '../api/client';
import DonorAutocomplete, { Donor } from './DonorAutocomplete';
import ProjectOrChildAutocomplete from './ProjectOrChildAutocomplete';
import { parseCurrency } from '../utils/currency';

interface Option {
  id: number;
  name: string;
  type: 'project' | 'child';
}

interface DonationFormProps {
  onSuccess?: () => void;
}

const DonationForm: React.FC<DonationFormProps> = ({ onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [selectedProjectOrChild, setSelectedProjectOrChild] =
    useState<Option | null>({
      id: 0,
      name: 'General Donation',
      type: 'project',
    });
  const [paymentMethod, setPaymentMethod] = useState('check');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setIsSubmitting(true);

    if (!selectedDonor) {
      return;
    }

    try {
      // Extract project_id or child_id from selection
      const projectId =
        selectedProjectOrChild?.type === 'project' &&
        selectedProjectOrChild.id > 0
          ? selectedProjectOrChild.id
          : null;

      const childId =
        selectedProjectOrChild?.type === 'child'
          ? selectedProjectOrChild.id
          : null;

      // Create donation (backend handles sponsorship auto-creation)
      await createDonation({
        amount: parseCurrency(amount),
        date,
        donor_id: selectedDonor.id,
        project_id: projectId,
        child_id: childId,
        payment_method: paymentMethod,
      });

      setSuccess(true);
      setAmount('');
      setSelectedDonor(null);
      setSelectedProjectOrChild({
        id: 0,
        name: 'General Donation',
        type: 'project',
      });
      setDate(new Date().toISOString().split('T')[0]);
      onSuccess?.(); // Notify parent to refresh donation list
    } catch (err) {
      // Error silently handled
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {success && (
          <Alert severity="success">Donation created successfully!</Alert>
        )}
        <ProjectOrChildAutocomplete
          value={selectedProjectOrChild}
          onChange={setSelectedProjectOrChild}
          size="small"
        />
        <DonorAutocomplete
          value={selectedDonor}
          onChange={setSelectedDonor}
          required={!selectedDonor}
          size="small"
        />
        <TextField
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputProps={{ step: 0.01 }}
          fullWidth
          required
          size="small"
        />
        <TextField
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          fullWidth
          required
          size="small"
          slotProps={{
            inputLabel: {
              shrink: true,
            },
          }}
        />
        <FormControl fullWidth size="small" required>
          <InputLabel id="payment-method-label">Payment Method</InputLabel>
          <Select
            labelId="payment-method-label"
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <MenuItem value="stripe">Stripe</MenuItem>
            <MenuItem value="check">Check</MenuItem>
            <MenuItem value="cash">Cash</MenuItem>
            <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
          </Select>
        </FormControl>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Donation'}
        </Button>
      </Stack>
    </form>
  );
};

export default DonationForm;
