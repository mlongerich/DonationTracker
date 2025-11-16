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
  status: 'succeeded' | 'failed' | 'refunded' | 'canceled' | 'needs_attention';
  description?: string;
  stripe_subscription_id?: string | null;
  duplicate_subscription_detected?: boolean;
  needs_attention_reason?: string | null;
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
