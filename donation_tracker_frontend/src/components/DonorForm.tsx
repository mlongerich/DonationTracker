import { useState, useEffect, FormEvent } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { Donor, DonorFormData } from '../types';

interface DonorFormProps {
  donor?: Donor;
  onSubmit: (data: DonorFormData) => void;
  onCancel?: () => void;
}

function DonorForm({ donor, onSubmit, onCancel }: DonorFormProps) {
  const [name, setName] = useState(donor?.name || '');
  const [email, setEmail] = useState(donor?.email || '');

  // Update form when donor prop changes
  useEffect(() => {
    if (donor) {
      setName(donor.name);
      setEmail(donor.email);
    } else {
      setName('');
      setEmail('');
    }
  }, [donor]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ name, email });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          size="small"
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          size="small"
        />
        <Button type="submit" variant="contained" color="primary" fullWidth>
          {donor ? 'Update' : 'Submit'}
        </Button>
        {donor && (
          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
      </Stack>
    </form>
  );
}

export default DonorForm;
