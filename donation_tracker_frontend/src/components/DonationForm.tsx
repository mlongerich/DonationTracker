import React, { useState } from 'react';
import { createDonation } from '../api/client';

interface Donor {
  id: number;
  name: string;
  email: string;
}

interface DonationFormProps {
  donors: Donor[];
  onSuccess?: () => void;
}

const DonationForm: React.FC<DonationFormProps> = ({ donors, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [donorId, setDonorId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setIsSubmitting(true);

    try {
      await createDonation({
        amount: parseFloat(amount),
        date,
        donor_id: parseInt(donorId, 10),
      });

      setSuccess(true);
      setAmount('');
      setDonorId('');
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

      <label htmlFor="donor_id">Donor</label>
      <select
        id="donor_id"
        value={donorId}
        onChange={(e) => setDonorId(e.target.value)}
        required
      >
        <option value="">Select a donor...</option>
        {donors.map((donor) => (
          <option key={donor.id} value={donor.id}>
            {donor.name} ({donor.email})
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
