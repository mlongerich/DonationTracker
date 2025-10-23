import { useState, useEffect } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import apiClient from '../api/client';
import { shouldDisplayEmail } from '../utils/emailUtils';
import { Donor } from '../types';

export type { Donor };

interface DonorAutocompleteProps {
  value: Donor | null;
  onChange: (donor: Donor | null) => void;
  label?: string;
  required?: boolean;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
}

const DonorAutocomplete: React.FC<DonorAutocompleteProps> = ({
  value,
  onChange,
  label = 'Donor',
  required = false,
  size = 'medium',
  fullWidth = true,
}) => {
  const [donorOptions, setDonorOptions] = useState<Donor[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Debounced search for donors
  useEffect(() => {
    if (searchInput.trim()) {
      setIsTyping(true);
    }

    const timer = setTimeout(async () => {
      if (searchInput.trim()) {
        setIsTyping(false);
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
        setIsTyping(false);
        setDonorOptions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const getOptionLabel = (option: Donor): string => {
    if (shouldDisplayEmail(option.email)) {
      return `${option.name} (${option.email})`;
    }
    return `${option.name} (No email provided)`;
  };

  const getNoOptionsText = () => {
    if (isTyping || loading) return 'Searching...';
    if (searchInput.trim()) return 'No results';
    return 'Type to search';
  };

  return (
    <Autocomplete
      options={donorOptions}
      loading={loading}
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      inputValue={searchInput}
      onInputChange={(_, newInputValue) => setSearchInput(newInputValue)}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      noOptionsText={getNoOptionsText()}
      loadingText="Searching..."
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          size={size}
          fullWidth={fullWidth}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
};

export default DonorAutocomplete;
