import { useState } from 'react';
import StandardDialog from './StandardDialog';
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
      console.log('QuickDonorCreateDialog: Submitting donor', data);
      const response = await apiClient.post('/api/donors', { donor: data });
      console.log('QuickDonorCreateDialog: Success response', response.data);
      const newDonor = response.data.donor;
      onSuccess(newDonor);
      onClose();
    } catch (err: any) {
      console.error('QuickDonorCreateDialog: Error creating donor', err);
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

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="Create New Donor"
      error={error}
      onErrorClose={() => setError(null)}
    >
      <DonorForm
        key={open ? `${preFillName}-${preFillEmail}` : 'closed'}
        initialName={preFillName}
        initialEmail={preFillEmail}
        onSubmit={handleSubmit}
      />
    </StandardDialog>
  );
};

export default QuickDonorCreateDialog;
