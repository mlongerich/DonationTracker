/**
 * Project type enumeration matching backend enum.
 */
export type ProjectType = 'general' | 'campaign' | 'sponsorship';

/**
 * Represents a project or campaign for organizing donations.
 */
export interface Project {
  id: number;
  title: string;
  description?: string;
  project_type: ProjectType;
  system: boolean;
}

/**
 * Data required to create or update a project.
 */
export interface ProjectFormData {
  title: string;
  description?: string;
  project_type: string;
}
