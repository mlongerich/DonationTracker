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
  status?: string;
  description?: string;
}
