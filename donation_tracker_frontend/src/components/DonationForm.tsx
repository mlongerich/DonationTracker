import React, { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import { createDonation, fetchProjects } from '../api/client';
import DonorAutocomplete, { Donor } from './DonorAutocomplete';
import { Project } from '../types';

interface DonationFormProps {
  onSuccess?: () => void;
}

const DonationForm: React.FC<DonationFormProps> = ({ onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await fetchProjects();
        setProjects(data.projects);
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      }
    };
    loadProjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setIsSubmitting(true);

    if (!selectedDonor) {
      return;
    }

    try {
      await createDonation({
        amount: parseFloat(amount),
        date,
        donor_id: selectedDonor.id,
        project_id: projectId,
      });

      setSuccess(true);
      setAmount('');
      setSelectedDonor(null);
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
        {success && <Alert severity="success">Donation created successfully!</Alert>}
        <TextField
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputProps={{ step: 0.01 }}
          fullWidth
          required
        />
        <TextField
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          fullWidth
          required
          slotProps={{
            inputLabel: {
              shrink: true,
            },
          }}
        />
        <DonorAutocomplete
          value={selectedDonor}
          onChange={setSelectedDonor}
          required={!selectedDonor}
        />
        <TextField
          select
          label="Project"
          value={projectId || ''}
          onChange={(e) => setProjectId(e.target.value ? parseInt(e.target.value) : null)}
          fullWidth
        >
          <MenuItem value="">General Donation</MenuItem>
          {projects.map((project) => (
            <MenuItem key={project.id} value={project.id}>
              {project.title}
            </MenuItem>
          ))}
        </TextField>
        <Button type="submit" variant="contained" color="primary" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Donation'}
        </Button>
      </Stack>
    </form>
  );
};

export default DonationForm;
