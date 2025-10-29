import { useState, useEffect } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import apiClient from '../api/client';
import { shouldDisplayEmail } from '../utils/emailUtils';
import { Donor } from '../types';
import { useDebouncedValue } from '../hooks';

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
  const debouncedSearchInput = useDebouncedValue(searchInput, 300);
  const [loading, setLoading] = useState(false);
  const isTyping = searchInput.trim() !== '' && searchInput !== debouncedSearchInput;

  // Search for donors when debounced input changes
  useEffect(() => {
    const searchDonors = async () => {
      if (debouncedSearchInput.trim()) {
        setLoading(true);
        try {
          const response = await apiClient.get('/api/donors', {
            params: {
              q: { name_or_email_cont: debouncedSearchInput },
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
    };

    searchDonors();
  }, [debouncedSearchInput]);

  const getOptionLabel = (option: Donor): string => {
    if (shouldDisplayEmail(option.email)) {
      return `${option.name} (${option.email})`;
    }
    return `${option.name} (No email provided)`;
  };

  const getNoOptionsText = () => {
    if (isTyping) return 'Searching...';
    if (loading) return 'Searching...';
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
