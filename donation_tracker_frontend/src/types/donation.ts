/**
 * Represents a financial donation to the organization.
 */
export interface Donation {
  id: number;
  amount: string;
  date: string;
  donor_id: number;
  donor_name?: string;
  project_id?: number | null;
  project_title?: string;
  payment_method?: 'stripe' | 'check' | 'cash' | 'bank_transfer' | null;
  status?: string;
  description?: string;
}

/**
 * Data required to create or update a donation.
 */
export interface DonationFormData {
  amount: number;
  date: string;
  donor_id: number;
  project_id?: number | null;
  sponsorship_id?: number | null;
  child_id?: number | null;
  payment_method?: string;
  status?: string;
  description?: string;
}
