// Mock axios first to avoid ESM issues
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      post: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() }
      }
    }))
  }
}));

// Now we can import and use the actual client module
import apiClient from './client';
const actualModule = jest.requireActual<typeof import('./client')>('./client');
const {
  mergeDonors,
  fetchChildren,
  fetchSponsorshipsForDonation,
  createSponsorship
} = actualModule;

describe('mergeDonors', () => {
  it('calls apiClient.post with correct endpoint and payload', async () => {
    const mockMergedDonor = {
      id: 3,
      name: 'Alice Smith',
      email: 'alice.smith@example.com',
    };

    (apiClient.post as jest.Mock).mockResolvedValue({ data: mockMergedDonor });

    const result = await mergeDonors([1, 2], { name: 1, email: 2 });

    expect(apiClient.post).toHaveBeenCalledWith('/api/donors/merge', {
      donor_ids: [1, 2],
      field_selections: { name: 1, email: 2 },
    });
    expect(result).toEqual(mockMergedDonor);
  });
});

describe('fetchChildren', () => {
  it('calls apiClient.get with correct endpoint and search query', async () => {
    const mockChildren = [
      { id: 1, name: 'Maria', discarded_at: null },
      { id: 2, name: 'Carlos', discarded_at: null }
    ];

    (apiClient.get as jest.Mock).mockResolvedValue({ data: { children: mockChildren } });

    const result = await fetchChildren('Mar');

    expect(apiClient.get).toHaveBeenCalledWith('/api/children', {
      params: {
        q: { name_cont: 'Mar' },
        per_page: 10
      }
    });
    expect(result).toEqual(mockChildren);
  });
});

describe('fetchSponsorshipsForDonation', () => {
  it('searches by child_id and donor_id for active sponsorships', async () => {
    const mockSponsorships = [
      {
        id: 1,
        child_id: 1,
        child_name: 'Maria',
        donor_id: 5,
        monthly_amount: '50',
        active: true
      }
    ];

    (apiClient.get as jest.Mock).mockResolvedValue({ data: { sponsorships: mockSponsorships } });

    const result = await fetchSponsorshipsForDonation(5, 1);

    expect(apiClient.get).toHaveBeenCalledWith('/api/sponsorships', {
      params: {
        per_page: 100,
        q: {
          child_id_eq: 1,
          donor_id_eq: 5,
          end_date_null: true
        }
      }
    });
    expect(result).toEqual(mockSponsorships);
  });
});

describe('createSponsorship', () => {
  it('posts new sponsorship and returns singular sponsorship object', async () => {
    const formData = {
      donor_id: 5,
      child_id: 1,
      monthly_amount: 50
    };

    const mockSponsorship = {
      id: 10,
      child_id: 1,
      child_name: 'Maria',
      donor_id: 5,
      donor_name: 'John Doe',
      monthly_amount: '50',
      project_id: 20,
      active: true
    };

    (apiClient.post as jest.Mock).mockResolvedValue({ data: { sponsorship: mockSponsorship } });

    const result = await createSponsorship(formData);

    expect(apiClient.post).toHaveBeenCalledWith('/api/sponsorships', {
      sponsorship: formData
    });
    expect(result).toEqual(mockSponsorship);
  });
});

describe('fetchProjectsBySearch', () => {
  it('calls apiClient.get with correct endpoint and search query', async () => {
    const mockProjects = [
      { id: 1, title: 'Project Alpha', project_type: 'general' },
      { id: 2, title: 'Project Beta', project_type: 'general' }
    ];

    (apiClient.get as jest.Mock).mockResolvedValue({ data: { projects: mockProjects } });

    const result = await actualModule.fetchProjectsBySearch('Alpha');

    expect(apiClient.get).toHaveBeenCalledWith('/api/projects', {
      params: {
        q: { title_cont: 'Alpha' },
        per_page: 10
      }
    });
    expect(result).toEqual(mockProjects);
  });
});
