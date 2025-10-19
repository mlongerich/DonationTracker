import React, { useState } from 'react';
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
  onConfirm: (fieldSelections: { name: number; email: number }) => void;
}

const DonorMergeModal: React.FC<DonorMergeModalProps> = ({
  open,
  donors,
  onClose,
  onConfirm,
}) => {
  const [selectedName, setSelectedName] = useState<number>(donors[0]?.id || 0);
  const [selectedEmail, setSelectedEmail] = useState<number>(
    donors[0]?.id || 0
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Merge Donors</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {donors.map((donor) => (
            <Box key={donor.id}>
              <Typography>{donor.name}</Typography>
              <Typography>{donor.email}</Typography>
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

          <FormControl component="fieldset">
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
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => {
            onConfirm({ name: selectedName, email: selectedEmail });
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
