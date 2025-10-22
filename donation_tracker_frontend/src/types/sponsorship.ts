/**
 * Represents a sponsorship relationship between a donor and a child.
 */
export interface Sponsorship {
  id: number;
  donor_id: number;
  donor_name: string;
  child_id: number;
  child_name: string;
  project_id?: number;
  project_title?: string;
  monthly_amount: string;
  start_date?: string;
  active: boolean;
  end_date?: string | null;
}

/**
 * Form data for creating a new sponsorship.
 */
export interface SponsorshipFormData {
  donor_id: number;
  child_id: number;
  monthly_amount: number;
}
