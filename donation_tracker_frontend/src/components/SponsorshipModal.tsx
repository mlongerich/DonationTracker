import { Dialog, DialogTitle, DialogContent } from '@mui/material';
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
  const handleSubmit = async (data: SponsorshipFormData) => {
    await apiClient.post('/api/sponsorships', { sponsorship: data });
    onSuccess();
  };

  return (
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
  );
};

export default SponsorshipModal;
