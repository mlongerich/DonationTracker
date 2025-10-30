import React, { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import {
  createDonation,
  fetchSponsorshipsForDonation,
  createSponsorship,
} from '../api/client';
import DonorAutocomplete, { Donor } from './DonorAutocomplete';
import ProjectOrChildAutocomplete from './ProjectOrChildAutocomplete';

interface Option {
  id: number;
  name: string;
  type: 'project' | 'child';
}

interface DonationFormProps {
  onSuccess?: () => void;
}

const DonationForm: React.FC<DonationFormProps> = ({ onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [selectedProjectOrChild, setSelectedProjectOrChild] =
    useState<Option | null>({
      id: 0,
      name: 'General Donation',
      type: 'project',
    });
  const [sponsorshipId, setSponsorshipId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Sponsorship detection: when child + donor selected, check for existing sponsorships
  useEffect(() => {
    const detectOrCreateSponsorship = async () => {
      // Only run when we have both a child and a donor
      if (
        !selectedProjectOrChild ||
        selectedProjectOrChild.type !== 'child' ||
        !selectedDonor
      ) {
        setSponsorshipId(null);
        return;
      }

      const childId = selectedProjectOrChild.id;
      const donorId = selectedDonor.id;

      try {
        // Search for existing sponsorships
        const sponsorships = await fetchSponsorshipsForDonation(donorId, childId);

        if (sponsorships.length === 0) {
          // No sponsorship exists - auto-create one
          const newSponsorship = await createSponsorship({
            donor_id: donorId,
            child_id: childId,
            monthly_amount: 0, // Will be updated when user submits
          });
          setSponsorshipId(newSponsorship.id);
        } else if (sponsorships.length === 1) {
          // Exactly one sponsorship - auto-select it
          setSponsorshipId(sponsorships[0].id);
        } else {
          // Multiple sponsorships - for now, just use the first one
          // TODO: Show modal for user to select
          setSponsorshipId(sponsorships[0].id);
        }
      } catch (error) {
        console.error('Failed to detect/create sponsorship:', error);
        setSponsorshipId(null);
      }
    };

    detectOrCreateSponsorship();
  }, [selectedProjectOrChild, selectedDonor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setIsSubmitting(true);

    if (!selectedDonor) {
      return;
    }

    // Extract project_id from selection (only if type is 'project' and id > 0)
    // id: 0 represents "General Donation" which should be null
    const projectId =
      selectedProjectOrChild?.type === 'project' && selectedProjectOrChild.id > 0
        ? selectedProjectOrChild.id
        : null;

    try {
      await createDonation({
        amount: parseFloat(amount),
        date,
        donor_id: selectedDonor.id,
        project_id: projectId,
        sponsorship_id: sponsorshipId,
      });

      setSuccess(true);
      setAmount('');
      setSelectedDonor(null);
      setSelectedProjectOrChild({ id: 0, name: 'General Donation', type: 'project' });
      setSponsorshipId(null);
      setDate(new Date().toISOString().split('T')[0]);
      onSuccess?.(); // Notify parent to refresh donation list
    } catch (err) {
      console.error('Failed to create donation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {success && (
          <Alert severity="success">Donation created successfully!</Alert>
        )}
        <ProjectOrChildAutocomplete
          value={selectedProjectOrChild}
          onChange={setSelectedProjectOrChild}
          size="small"
        />
        <DonorAutocomplete
          value={selectedDonor}
          onChange={setSelectedDonor}
          required={!selectedDonor}
          size="small"
        />
        <TextField
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputProps={{ step: 0.01 }}
          fullWidth
          required
          size="small"
        />
        <TextField
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          fullWidth
          required
          size="small"
          slotProps={{
            inputLabel: {
              shrink: true,
            },
          }}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Donation'}
        </Button>
      </Stack>
    </form>
  );
};

export default DonationForm;
