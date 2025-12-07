import { useState } from 'react';
import StandardDialog from './StandardDialog';
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
        const errorMessage =
          err.response.data.errors?.[0] || 'Validation error';
        setError(errorMessage);
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`Add Sponsor for ${childName}`}
      error={error}
      onErrorClose={() => setError(null)}
    >
      <SponsorshipForm childId={childId} onSubmit={handleSubmit} />
    </StandardDialog>
  );
};

export default SponsorshipModal;
