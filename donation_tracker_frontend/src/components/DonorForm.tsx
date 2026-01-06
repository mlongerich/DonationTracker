import { useState, useEffect, FormEvent } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { Donor, DonorFormData } from '../types';

interface DonorFormProps {
  donor?: Donor;
  initialName?: string;
  initialEmail?: string;
  onSubmit: (data: DonorFormData) => void;
  onCancel?: () => void;
}

function DonorForm({
  donor,
  initialName = '',
  initialEmail = '',
  onSubmit,
  onCancel,
}: DonorFormProps) {
  const [name, setName] = useState(donor?.name || initialName);
  const [email, setEmail] = useState(donor?.email || initialEmail);
  const [phone, setPhone] = useState(donor?.phone || '');
  const [addressLine1, setAddressLine1] = useState(donor?.address_line1 || '');
  const [addressLine2, setAddressLine2] = useState(donor?.address_line2 || '');
  const [city, setCity] = useState(donor?.city || '');
  const [state, setState] = useState(donor?.state || '');
  const [zipCode, setZipCode] = useState(donor?.zip_code || '');
  const [country, setCountry] = useState(donor?.country || 'USA');

  // Update form when donor prop changes
  useEffect(() => {
    if (donor) {
      setName(donor.name);
      setEmail(donor.email);
      setPhone(donor.phone || '');
      setAddressLine1(donor.address_line1 || '');
      setAddressLine2(donor.address_line2 || '');
      setCity(donor.city || '');
      setState(donor.state || '');
      setZipCode(donor.zip_code || '');
      setCountry(donor.country || 'USA');
    } else {
      setName(initialName);
      setEmail(initialEmail);
      setPhone('');
      setAddressLine1('');
      setAddressLine2('');
      setCity('');
      setState('');
      setZipCode('');
      setCountry('USA');
    }
  }, [donor, initialName, initialEmail]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      email,
      phone,
      address_line1: addressLine1,
      address_line2: addressLine2,
      city,
      state,
      zip_code: zipCode,
      country,
    });
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
        <TextField
          label="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 123-4567"
          fullWidth
          size="small"
        />
        <TextField
          label="Address Line 1"
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
          fullWidth
          size="small"
        />
        <TextField
          label="Address Line 2"
          value={addressLine2}
          onChange={(e) => setAddressLine2(e.target.value)}
          fullWidth
          size="small"
        />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            size="small"
            sx={{ flex: 2 }}
          />
          <TextField
            label="State/Province"
            value={state}
            onChange={(e) => setState(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
          />
          <TextField
            label="Zip/Postal Code"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            inputProps={{ maxLength: 10 }}
          />
        </Box>
        <TextField
          label="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          fullWidth
          size="small"
        />
        {donor && onCancel ? (
          <Stack direction="row" spacing={2}>
            <Button type="submit" variant="contained" color="primary" fullWidth>
              Update
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={onCancel}
              fullWidth
            >
              Cancel
            </Button>
          </Stack>
        ) : (
          <Button type="submit" variant="contained" color="primary" fullWidth>
            Submit
          </Button>
        )}
      </Stack>
    </form>
  );
}

export default DonorForm;
