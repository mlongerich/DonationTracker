/**
 * Represents a child who can receive sponsorships.
 */
export interface Child {
  id: number;
  name: string;
  gender?: 'boy' | 'girl' | null;
  created_at: string;
  updated_at: string;
  can_be_deleted: boolean;
  last_donation_date?: string | null;
  discarded_at?: string | null;
}

/**
 * Form data for creating or updating a child.
 */
export interface ChildFormData {
  name: string;
  gender?: string | null;
}
