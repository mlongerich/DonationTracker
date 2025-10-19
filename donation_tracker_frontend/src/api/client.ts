import axios from 'axios';

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

export const createDonation = async (donation: {
  amount: number;
  date: string;
  donor_id: number;
  project_id?: number | null;
  status?: string;
  description?: string;
}) => {
  const response = await apiClient.post('/api/donations', { donation });
  return response.data;
};

// Project API methods
export const fetchProjects = async (params?: { page?: number; per_page?: number }) => {
  const response = await apiClient.get('/api/projects', { params });
  return response.data;
};

export const fetchProject = async (id: number) => {
  const response = await apiClient.get(`/api/projects/${id}`);
  return response.data;
};

export const createProject = async (project: {
  title: string;
  description?: string;
  project_type: string;
}) => {
  const response = await apiClient.post('/api/projects', { project });
  return response.data;
};

export const updateProject = async (id: number, project: {
  title?: string;
  description?: string;
  project_type?: string;
}) => {
  const response = await apiClient.put(`/api/projects/${id}`, { project });
  return response.data;
};

export const deleteProject = async (id: number) => {
  const response = await apiClient.delete(`/api/projects/${id}`);
  return response.data;
};

export default apiClient;
