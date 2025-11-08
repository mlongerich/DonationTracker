import { useState, useEffect } from 'react';
import { Autocomplete, TextField, Chip } from '@mui/material';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import FolderIcon from '@mui/icons-material/Folder';
import { useDebouncedValue } from '../hooks';
import { searchProjectOrChild } from '../api/client';
import { Project, Child, ProjectType } from '../types';

interface Option {
  id: number;
  name: string;
  type: 'project' | 'child';
  project_type?: ProjectType;
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
  label = 'Donation For',
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
          const { projects, children } =
            await searchProjectOrChild(debouncedInputValue);

          const projectOptions: Option[] = (projects || []).map(
            (p: Project) => ({
              id: p.id,
              name: p.title,
              type: 'project' as const,
              project_type: p.project_type,
            })
          );
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
      renderOption={(props, option) => {
        const { key, ...otherProps } = props as any;
        return (
          <li key={key} {...otherProps}>
            {option.type === 'child' && (
              <Chip
                label="Child"
                size="small"
                icon={<ChildCareIcon />}
                sx={{ mr: 1 }}
              />
            )}
            {option.type === 'project' && option.project_type === 'general' && (
              <Chip
                label="General"
                size="small"
                icon={<FolderIcon />}
                sx={{ mr: 1 }}
              />
            )}
            {option.type === 'project' &&
              option.project_type === 'campaign' && (
                <Chip
                  label="Campaign"
                  size="small"
                  icon={<FolderIcon />}
                  sx={{ mr: 1 }}
                />
              )}
            {option.type === 'project' &&
              option.project_type === 'sponsorship' && (
                <Chip
                  label="Project"
                  size="small"
                  icon={<FolderIcon />}
                  sx={{ mr: 1 }}
                />
              )}
            {option.name}
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField {...params} label={label} required={required} size={size} />
      )}
    />
  );
};

export default ProjectOrChildAutocomplete;
