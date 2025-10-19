import { useState, useEffect, FormEvent } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import apiClient from '../api/client';
import { Donor, DonorFormData } from '../types';

interface DonorFormProps {
  donor?: Donor;
  onSubmit?: (data: DonorFormData) => void;
  onCancel?: () => void;
}

function DonorForm({ donor, onSubmit, onCancel }: DonorFormProps) {
  const [name, setName] = useState(donor?.name || '');
  const [email, setEmail] = useState(donor?.email || '');
  const [success, setSuccess] = useState<'created' | 'updated' | false>(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setError('');

    try {
      const response = donor
        ? await apiClient.patch(`/api/donors/${donor.id}`, {
            donor: {
              name,
              email,
            },
          })
        : await apiClient.post('/api/donors', {
            donor: {
              name,
              email,
            },
          });

      setSuccess(response.status === 201 ? 'created' : 'updated');
      if (!donor) {
        setName('');
        setEmail('');
      }
      onSubmit?.({ name, email });
    } catch (err: any) {
      setError(
        err.response?.data?.error || err.message || 'Failed to create donor'
      );
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {success && (
          <Alert severity="success">Donor {success} successfully!</Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
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
