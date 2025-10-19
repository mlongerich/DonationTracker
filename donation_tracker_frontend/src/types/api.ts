import { Donor } from './donor';
import { Donation } from './donation';
import { Project } from './project';
import { PaginationMeta } from './pagination';

/**
 * Generic API error response structure.
 */
export interface ApiErrorResponse {
  errors: string[];
}

/**
 * API response for donors list endpoint.
 */
export interface DonorsApiResponse {
  donors: Donor[];
  meta: PaginationMeta;
}

/**
 * API response for donations list endpoint.
 */
export interface DonationsApiResponse {
  donations: Donation[];
  meta: PaginationMeta;
}

/**
 * API response for projects list endpoint.
 */
export interface ProjectsApiResponse {
  projects: Project[];
  meta: PaginationMeta;
}
