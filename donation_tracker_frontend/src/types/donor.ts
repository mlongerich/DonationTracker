/**
 * Represents a donor who contributes to the organization.
 */
export interface Donor {
  id: number;
  name: string;
  email: string;
  displayable_email: string | null; // null for placeholder emails (@mailinator.com)
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
  full_address?: string | null;
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
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
}

/**
 * API response for donor merge operation.
 */
export interface DonorMergeResult {
  merged_donor: Donor;
  merged_count: number;
}
