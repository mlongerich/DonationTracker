import React, { useState, useEffect } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import { createDonation } from '../api/client';
import apiClient from '../api/client';
import { shouldDisplayEmail } from '../utils/emailUtils';

interface Donor {
  id: number;
  name: string;
  email: string;
}

interface DonationFormProps {
  onSuccess?: () => void;
}

const DonationForm: React.FC<DonationFormProps> = ({ onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [donorOptions, setDonorOptions] = useState<Donor[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setIsSubmitting(true);

    if (!selectedDonor) {
      return;
    }

    try {
      await createDonation({
        amount: parseFloat(amount),
        date,
        donor_id: selectedDonor.id,
      });

      setSuccess(true);
      setAmount('');
      setSelectedDonor(null);
      setSearchInput('');
      setDate(new Date().toISOString().split('T')[0]);
      onSuccess?.(); // Notify parent to refresh donation list
    } catch (err) {
      console.error('Failed to create donation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="amount">Amount</label>
      <input
        id="amount"
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />

      <label htmlFor="date">Date</label>
      <input
        id="date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />

      <Autocomplete
        options={donorOptions}
        loading={loading}
        value={selectedDonor}
        onChange={(_, newValue) => setSelectedDonor(newValue)}
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
            required={!selectedDonor}
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

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Donation'}
      </button>

      {success && <div role="alert">Donation created successfully!</div>}
    </form>
  );
};

export default DonationForm;
