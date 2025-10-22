import { useState } from 'react';
import { Stack, TextField, Button } from '@mui/material';
import DonorAutocomplete from './DonorAutocomplete';
import ChildAutocomplete from './ChildAutocomplete';
import { Donor, Child, SponsorshipFormData } from '../types';

interface SponsorshipFormProps {
  onSubmit: (data: SponsorshipFormData) => void | Promise<void>;
  onCancel: () => void;
  childId?: number;
}

const SponsorshipForm: React.FC<SponsorshipFormProps> = ({ onSubmit, onCancel, childId }) => {
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [monthlyAmount, setMonthlyAmount] = useState<number>(0);

  const handleSubmit = () => {
    const finalChildId = childId ?? selectedChild?.id;

    if (!selectedDonor || monthlyAmount <= 0 || !finalChildId) {
      return;
    }

    onSubmit({
      donor_id: selectedDonor.id,
      child_id: finalChildId,
      monthly_amount: monthlyAmount
    });
  };

  return (
    <Stack spacing={2}>
      <DonorAutocomplete
        value={selectedDonor}
        onChange={setSelectedDonor}
        label="Donor"
        required
      />
      {!childId && (
        <ChildAutocomplete
          value={selectedChild}
          onChange={setSelectedChild}
          label="Child"
          required
        />
      )}
      <TextField
        label="Monthly Amount"
        type="number"
        value={monthlyAmount}
        onChange={(e) => setMonthlyAmount(Number(e.target.value))}
        required
      />
      <Stack direction="row" spacing={2}>
        <Button variant="contained" onClick={handleSubmit}>Submit</Button>
        <Button variant="outlined" onClick={onCancel}>Cancel</Button>
      </Stack>
    </Stack>
  );
};

export default SponsorshipForm;
