import { useState, useEffect } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { useDebouncedValue } from '../hooks';
import { searchProjectOrChild } from '../api/client';
import { Project, Child } from '../types';

interface Option {
  id: number;
  name: string;
  type: 'project' | 'child';
}

interface ProjectOrChildAutocompleteProps {
  value: Option | null;
  onChange: (value: Option | null) => void;
  label?: string;
  size?: 'small' | 'medium';
  required?: boolean;
}

const ProjectOrChildAutocomplete = ({
  value,
  onChange,
  label = 'Project or Child',
  size = 'small',
  required = false,
}: ProjectOrChildAutocompleteProps) => {
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<Option[]>([]);
  const debouncedInputValue = useDebouncedValue(inputValue, 300);

  useEffect(() => {
    const searchOptions = async () => {
      if (debouncedInputValue.trim()) {
        setLoading(true);
        try {
          const { projects, children } = await searchProjectOrChild(debouncedInputValue);

          const projectOptions: Option[] = (projects || []).map((p: Project) => ({
            id: p.id,
            name: p.title,
            type: 'project' as const,
          }));
          const childOptions: Option[] = (children || []).map((c: Child) => ({
            id: c.id,
            name: c.name,
            type: 'child' as const,
          }));
          setOptions([...projectOptions, ...childOptions]);
        } catch (error) {
          console.error('Failed to search:', error);
          setOptions([]);
        } finally {
          setLoading(false);
        }
      } else {
        setOptions([]);
      }
    };

    searchOptions();
  }, [debouncedInputValue]);

  const getNoOptionsText = () => {
    if (loading) return 'Loading...';
    if (inputValue.trim()) return 'No results';
    return 'Type to search';
  };

  return (
    <Autocomplete
      value={value}
      onChange={(_event, newValue) => onChange(newValue)}
      inputValue={inputValue}
      onInputChange={(_event, newInputValue) => setInputValue(newInputValue)}
      options={options}
      loading={loading}
      noOptionsText={getNoOptionsText()}
      loadingText="Loading..."
      groupBy={(option) =>
        option.type === 'project' ? 'Projects' : 'Children'
      }
      getOptionLabel={(option) => option.name}
      renderInput={(params) => (
        <TextField {...params} label={label} required={required} size={size} />
      )}
    />
  );
};

export default ProjectOrChildAutocomplete;
