import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import apiClient from './api/client';

// Mock the entire client module
jest.mock('./api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  mergeDonors: jest.fn(),
  createDonation: jest.fn(),
  fetchProjects: jest.fn(),
  createProject: jest.fn(),
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock API calls to prevent errors
    mockedApiClient.get.mockImplementation((url: string) => {
      if (
        url === '/api/donations' ||
        url === '/api/donors' ||
        url === '/api/projects'
      ) {
        return Promise.resolve({
          data: {
            donations: [],
            donors: [],
            projects: [],
            meta: {
              total_count: 0,
              total_pages: 0,
              current_page: 1,
              per_page: 25,
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('renders with MUI ThemeProvider', async () => {
    render(<App />);

    // Should render navigation
    expect(screen.getByText('Donation Tracker')).toBeInTheDocument();
  });

  it('renders DonationsPage at root route', async () => {
    render(<App />);

    // Should render DonationsPage by default
    expect(await screen.findByText(/donation management/i)).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<App />);

    // Navigation should have links
    expect(
      screen.getByRole('link', { name: /donations/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /donors/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /projects/i })).toBeInTheDocument();
  });
});
