import { useState, useEffect } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { useDebouncedValue } from '../hooks';
import { fetchProjects, fetchChildren } from '../api/client';
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
    if (debouncedInputValue.length > 0) {
      Promise.all([
        fetchProjects(debouncedInputValue),
        fetchChildren(debouncedInputValue),
      ]).then(([projects, children]) => {
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
        setLoading(false);
      });
    }
  }, [debouncedInputValue]);

  const handleInputChange = (
    _event: React.SyntheticEvent,
    newInputValue: string
  ) => {
    setInputValue(newInputValue);
    if (newInputValue.length > 0) {
      setLoading(true);
    } else {
      setLoading(false);
      setOptions([]);
    }
  };

  return (
    <Autocomplete
      value={value}
      onChange={(_event, newValue) => onChange(newValue)}
      onInputChange={handleInputChange}
      options={options}
      loading={loading}
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
