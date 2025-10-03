import { useState, FormEvent } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import apiClient from '../api/client';

interface DonorFormProps {
  onSubmit?: (data: { name: string; email: string }) => void;
}

function DonorForm({ onSubmit }: DonorFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState<'created' | 'updated' | false>(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setError('');

    try {
      const response = await apiClient.post('/api/donors', {
        donor: {
          name,
          email,
        },
      });

      setSuccess(response.status === 201 ? 'created' : 'updated');
      setName('');
      setEmail('');
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
          Submit
        </Button>
      </Stack>
    </form>
  );
}

export default DonorForm;
