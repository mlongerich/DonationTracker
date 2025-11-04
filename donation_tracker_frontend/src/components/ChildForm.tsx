import { TextField, Button, Stack } from '@mui/material';
import { useState } from 'react';
import { ChildFormData } from '../types';

interface ChildFormProps {
  onSubmit: (data: ChildFormData) => void;
  initialData?: ChildFormData;
}

const ChildForm: React.FC<ChildFormProps> = ({ onSubmit, initialData }) => {
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
        size="small"
      />
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleSubmit}
      >
        Submit
      </Button>
    </Stack>
  );
};

export default ChildForm;
