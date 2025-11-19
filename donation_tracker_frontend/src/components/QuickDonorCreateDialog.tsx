import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Snackbar,
  Alert,
  Box,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DonorForm from './DonorForm';
import { DonorFormData } from '../types';
import apiClient from '../api/client';

interface QuickDonorCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (donor: any) => void;
  preFillName?: string;
  preFillEmail?: string;
}

const QuickDonorCreateDialog: React.FC<QuickDonorCreateDialogProps> = ({
  open,
  onClose,
  onSuccess,
  preFillName = '',
  preFillEmail = '',
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: DonorFormData) => {
    try {
      const response = await apiClient.post('/api/donors', { donor: data });
      const newDonor = response.data.donor;
      onSuccess(newDonor);
      onClose();
    } catch (err: any) {
      if (err.response?.status === 422) {
        const validationErrors = err.response.data.errors;
        const errorMessage = Array.isArray(validationErrors)
          ? validationErrors.join(', ')
          : err.response.data.error || 'Validation failed';
        setError(errorMessage);
      } else {
        setError(err.response?.data?.error || 'Failed to create donor');
      }
    }
  };

  const handleCloseError = () => {
    setError(null);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Create New Donor
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ mt: 1 }}>
            <DonorForm
              key={open ? `${preFillName}-${preFillEmail}` : 'closed'}
              initialName={preFillName}
              initialEmail={preFillEmail}
              onSubmit={handleSubmit}
            />
          </Box>
        </DialogContent>
      </Dialog>
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseError}
      >
        <Alert
          onClose={handleCloseError}
          severity="error"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default QuickDonorCreateDialog;
