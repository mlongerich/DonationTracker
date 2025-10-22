import { TextField, Button, Stack } from '@mui/material';
import { useState } from 'react';
import { ChildFormData } from '../types';

interface ChildFormProps {
  onSubmit: (data: ChildFormData) => void;
  onCancel: () => void;
  initialData?: ChildFormData;
}

const ChildForm: React.FC<ChildFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setError('');
    onSubmit({ name });
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="Name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (error) setError('');
        }}
        error={!!error}
        helperText={error}
        required
        fullWidth
      />
      <Stack direction="row" spacing={2}>
        <Button variant="contained" onClick={handleSubmit}>
          Submit
        </Button>
        <Button variant="outlined" onClick={onCancel}>
          Cancel
        </Button>
      </Stack>
    </Stack>
  );
};

export default ChildForm;
