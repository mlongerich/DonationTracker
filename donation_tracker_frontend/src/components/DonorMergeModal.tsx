import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Button,
} from '@mui/material';
import { Donor } from '../types';

interface DonorMergeModalProps {
  open: boolean;
  donors: Donor[];
  onClose: () => void;
  onConfirm: (fieldSelections: {
    name: number;
    email: number;
    phone: number;
    address: number;
  }) => void;
}

const DonorMergeModal: React.FC<DonorMergeModalProps> = ({
  open,
  donors,
  onClose,
  onConfirm,
}) => {
  const [selectedName, setSelectedName] = useState<number>(0);
  const [selectedEmail, setSelectedEmail] = useState<number>(0);
  const [selectedPhone, setSelectedPhone] = useState<number>(0);
  const [selectedAddress, setSelectedAddress] = useState<number>(0);

  // Initialize selections when donors change
  useEffect(() => {
    if (donors.length > 0) {
      const firstDonorId = donors[0].id;
      setSelectedName(firstDonorId);
      setSelectedEmail(firstDonorId);
      setSelectedPhone(firstDonorId);
      setSelectedAddress(firstDonorId);
    }
  }, [donors]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Merge Donors</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {donors.map((donor) => (
            <Box key={donor.id}>
              <Typography variant="subtitle1" fontWeight="bold">
                {donor.name}
              </Typography>
              <Typography variant="body2">{donor.email}</Typography>
              <Typography variant="body2" color="text.secondary">
                {donor.phone || 'No phone'}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ whiteSpace: 'pre-line' }}
              >
                {donor.full_address || 'No address'}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ mt: 3 }}>
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel component="legend">Name</FormLabel>
            <RadioGroup
              value={selectedName}
              onChange={(e) => setSelectedName(Number(e.target.value))}
            >
              {donors.map((donor) => (
                <FormControlLabel
                  key={donor.id}
                  value={donor.id}
                  control={<Radio />}
                  label={donor.name}
                />
              ))}
            </RadioGroup>
          </FormControl>

          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel component="legend">Email</FormLabel>
            <RadioGroup
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(Number(e.target.value))}
            >
              {donors.map((donor) => (
                <FormControlLabel
                  key={donor.id}
                  value={donor.id}
                  control={<Radio />}
                  label={donor.email}
                />
              ))}
            </RadioGroup>
          </FormControl>

          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel component="legend">Phone</FormLabel>
            <RadioGroup
              value={selectedPhone}
              onChange={(e) => setSelectedPhone(Number(e.target.value))}
            >
              {donors.map((donor) => (
                <FormControlLabel
                  key={donor.id}
                  value={donor.id}
                  control={<Radio />}
                  label={donor.phone || 'No phone'}
                />
              ))}
            </RadioGroup>
          </FormControl>

          <FormControl component="fieldset">
            <FormLabel component="legend">Address</FormLabel>
            <RadioGroup
              value={selectedAddress}
              onChange={(e) => setSelectedAddress(Number(e.target.value))}
            >
              {donors.map((donor) => (
                <FormControlLabel
                  key={donor.id}
                  value={donor.id}
                  control={<Radio />}
                  label={donor.full_address || 'No address'}
                  sx={{ alignItems: 'flex-start' }}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => {
            onConfirm({
              name: selectedName,
              email: selectedEmail,
              phone: selectedPhone,
              address: selectedAddress,
            });
            onClose();
          }}
        >
          Confirm Merge
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DonorMergeModal;
