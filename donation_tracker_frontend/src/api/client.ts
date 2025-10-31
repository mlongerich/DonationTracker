import axios from 'axios';
import { DonationFormData, ProjectFormData, SponsorshipFormData, Sponsorship } from '../types';

// Create axios instance with base configuration
export const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage or your auth context
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors globally
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }

    // Log error for debugging
    console.error('API Error:', error.response?.data || error.message);

    return Promise.reject(error);
  }
);

// API Methods
export const mergeDonors = async (
  donorIds: number[],
  fieldSelections: { name: number; email: number }
) => {
  const response = await apiClient.post('/api/donors/merge', {
    donor_ids: donorIds,
    field_selections: fieldSelections,
  });
  return response.data;
};

export const createDonation = async (donation: DonationFormData) => {
  const response = await apiClient.post('/api/donations', { donation });
  return response.data;
};

// Project API methods
export const fetchProjects = async (params?: { page?: number; per_page?: number }) => {
  const response = await apiClient.get('/api/projects', { params });
  return response.data;
};

export const fetchProjectsBySearch = async (searchQuery: string) => {
  const response = await apiClient.get('/api/projects', {
    params: {
      q: { title_cont: searchQuery },
      per_page: 10
    }
  });
  return response.data.projects || [];
};

export const searchProjectOrChild = async (query: string) => {
  const response = await apiClient.get('/api/search/project_or_child', {
    params: { q: query }
  });
  return response.data;
};

export const fetchProject = async (id: number) => {
  const response = await apiClient.get(`/api/projects/${id}`);
  return response.data;
};

export const createProject = async (project: ProjectFormData) => {
  const response = await apiClient.post('/api/projects', { project });
  return response.data;
};

export const updateProject = async (id: number, project: Partial<ProjectFormData>) => {
  const response = await apiClient.put(`/api/projects/${id}`, { project });
  return response.data;
};

export const deleteProject = async (id: number) => {
  const response = await apiClient.delete(`/api/projects/${id}`);
  return response.data;
};

// Children API methods
export const fetchChildren = async (searchQuery: string) => {
  const response = await apiClient.get('/api/children', {
    params: {
      q: { name_cont: searchQuery },
      per_page: 10
    }
  });
  return response.data.children || [];
};

// Sponsorship API methods
export const fetchSponsorshipsForDonation = async (
  donorId: number,
  childId: number
): Promise<Sponsorship[]> => {
  const response = await apiClient.get('/api/sponsorships', {
    params: {
      per_page: 100,
      q: {
        child_id_eq: childId,
        donor_id_eq: donorId,
        end_date_null: true
      }
    }
  });
  return response.data.sponsorships || [];
};

export const createSponsorship = async (data: SponsorshipFormData): Promise<Sponsorship> => {
  const response = await apiClient.post('/api/sponsorships', { sponsorship: data });
  return response.data.sponsorship;
};

export default apiClient;
