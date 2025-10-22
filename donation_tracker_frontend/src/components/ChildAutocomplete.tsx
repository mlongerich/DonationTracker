import { useState, useEffect } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import apiClient from '../api/client';
import { Child } from '../types';

interface ChildAutocompleteProps {
  value: Child | null;
  onChange: (child: Child | null) => void;
  label?: string;
  required?: boolean;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
}

const ChildAutocomplete: React.FC<ChildAutocompleteProps> = ({
  value,
  onChange,
  label = 'Child',
  required = false,
  size = 'medium',
  fullWidth = true,
}) => {
  const [childOptions, setChildOptions] = useState<Child[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Debounced search for children
  useEffect(() => {
    if (searchInput.trim()) {
      setIsTyping(true);
    }

    const timer = setTimeout(async () => {
      if (searchInput.trim()) {
        setIsTyping(false);
        setLoading(true);
        try {
          const response = await apiClient.get('/api/children', {
            params: {
              q: { name_cont: searchInput },
              per_page: 10,
            },
          });
          setChildOptions(response.data.children || []);
        } catch (error) {
          console.error('Failed to search children:', error);
          setChildOptions([]);
        } finally {
          setLoading(false);
        }
      } else {
        setIsTyping(false);
        setChildOptions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const getNoOptionsText = () => {
    if (isTyping || loading) return 'Searching...';
    if (searchInput.trim()) return 'No results';
    return 'Type to search';
  };

  return (
    <Autocomplete
      options={childOptions}
      loading={loading}
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      inputValue={searchInput}
      onInputChange={(_, newInputValue) => setSearchInput(newInputValue)}
      getOptionLabel={(option) => option.name}
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

export default ChildAutocomplete;
