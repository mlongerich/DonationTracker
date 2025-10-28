import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Snackbar, Alert } from '@mui/material';
import SponsorshipForm from './SponsorshipForm';
import { SponsorshipFormData } from '../types';
import apiClient from '../api/client';

interface SponsorshipModalProps {
  open: boolean;
  childId: number;
  childName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const SponsorshipModal: React.FC<SponsorshipModalProps> = ({
  open,
  childId,
  childName,
  onClose,
  onSuccess,
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: SponsorshipFormData) => {
    try {
      await apiClient.post('/api/sponsorships', { sponsorship: data });
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.response?.status === 422) {
        const errorMessage = err.response.data.errors?.[0] || 'Validation error';
        setError(errorMessage);
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  const handleCloseError = () => {
    setError(null);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>Add Sponsor for {childName}</DialogTitle>
        <DialogContent>
          <SponsorshipForm
            childId={childId}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        </DialogContent>
      </Dialog>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseError}>
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SponsorshipModal;
