/**
 * Represents a donor who contributes to the organization.
 */
export interface Donor {
  id: number;
  name: string;
  email: string;
  displayable_email: string | null; // null for placeholder emails (@mailinator.com)
  discarded_at?: string | null;
  merged_into_id?: number | null;
  last_donation_date?: string | null;
}

/**
 * Data required to create or update a donor.
 */
export interface DonorFormData {
  name: string;
  email: string;
}

/**
 * API response for donor merge operation.
 */
export interface DonorMergeResult {
  merged_donor: Donor;
  merged_count: number;
}
