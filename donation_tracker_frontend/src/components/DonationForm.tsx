import React, { useState, useEffect } from 'react';
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
      <label htmlFor="amount">Amount</label>
      <input
        id="amount"
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />

      <label htmlFor="date">Date</label>
      <input
        id="date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />

      <DonorAutocomplete
        value={selectedDonor}
        onChange={setSelectedDonor}
        required={!selectedDonor}
      />

      <label htmlFor="project">Project</label>
      <select
        id="project"
        value={projectId || ''}
        onChange={(e) => setProjectId(e.target.value ? parseInt(e.target.value) : null)}
      >
        <option value="">General Donation</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.title}
          </option>
        ))}
      </select>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Donation'}
      </button>

      {success && <div role="alert">Donation created successfully!</div>}
    </form>
  );
};

export default DonationForm;
