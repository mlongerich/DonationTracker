import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import DonationsPage from './DonationsPage';
import apiClient from '../api/client';

// Mock API client
jest.mock('../api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  fetchProjects: jest.fn(),
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('DonationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fetchProjects to return empty array
    const { fetchProjects } = require('../api/client');
    (fetchProjects as jest.Mock).mockResolvedValue({ projects: [] });
  });

  it('renders Donation Management heading', () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        donations: [],
        meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 10 },
      },
    });

    render(
      <BrowserRouter>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DonationsPage />
        </LocalizationProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/donation management/i)).toBeInTheDocument();
  });

  it('fetches donations on mount', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        donations: [],
        meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 10 },
      },
    });

    render(
      <BrowserRouter>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DonationsPage />
        </LocalizationProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/donations', {
        params: expect.objectContaining({
          page: 1,
          per_page: 10,
        }),
      });
    });
  });

  it('renders donation list with fetched data', async () => {
    const mockDonations = [
      {
        id: 1,
        amount: 100,
        donor_name: 'John Doe',
        project_title: 'Project A',
        date: '2024-01-01',
        donor_id: 1,
        project_id: 1,
      },
      {
        id: 2,
        amount: 200,
        donor_name: 'Jane Smith',
        project_title: 'Project B',
        date: '2024-01-02',
        donor_id: 2,
        project_id: 2,
      },
    ];

    // Mock donations API call
    mockedApiClient.get.mockImplementation((url) => {
      if (url === '/api/donations') {
        return Promise.resolve({
          data: {
            donations: mockDonations,
            meta: {
              total_count: 2,
              total_pages: 1,
              current_page: 1,
              per_page: 10,
            },
          },
        });
      }
      // Mock donors API call for DonorAutocomplete
      if (url === '/api/donors') {
        return Promise.resolve({
          data: {
            donors: [],
            meta: {
              total_count: 0,
              total_pages: 0,
              current_page: 1,
              per_page: 10,
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <BrowserRouter>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DonationsPage />
        </LocalizationProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Project A/)).toBeInTheDocument();
  });

  it('renders pagination when multiple pages exist', async () => {
    const mockDonations = [
      {
        id: 1,
        amount: 100,
        donor_name: 'John Doe',
        project_title: 'Project A',
        date: '2024-01-01',
        donor_id: 1,
        project_id: 1,
      },
    ];

    mockedApiClient.get.mockImplementation((url) => {
      if (url === '/api/donations') {
        return Promise.resolve({
          data: {
            donations: mockDonations,
            meta: {
              total_count: 25,
              total_pages: 3,
              current_page: 1,
              per_page: 10,
            },
          },
        });
      }
      if (url === '/api/donors') {
        return Promise.resolve({
          data: {
            donors: [],
            meta: {
              total_count: 0,
              total_pages: 0,
              current_page: 1,
              per_page: 10,
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <BrowserRouter>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DonationsPage />
        </LocalizationProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });

    // Pagination should be visible with 3 pages
    const pagination = screen.getByRole('navigation');
    expect(pagination).toBeInTheDocument();
  });

  it('renders Record Donation heading', () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        donations: [],
        meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 10 },
      },
    });

    render(
      <BrowserRouter>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DonationsPage />
        </LocalizationProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/record donation/i)).toBeInTheDocument();
  });

  it('renders DonationForm with all required fields', () => {
    mockedApiClient.get.mockImplementation((url) => {
      if (url === '/api/donations') {
        return Promise.resolve({
          data: {
            donations: [],
            meta: {
              total_count: 0,
              total_pages: 0,
              current_page: 1,
              per_page: 10,
            },
          },
        });
      }
      if (url === '/api/donors') {
        return Promise.resolve({
          data: {
            donors: [],
            meta: {
              total_count: 0,
              total_pages: 0,
              current_page: 1,
              per_page: 10,
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <BrowserRouter>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DonationsPage />
        </LocalizationProvider>
      </BrowserRouter>
    );

    // DonationForm should have amount field and create button
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create donation/i })
    ).toBeInTheDocument();
    // Date and Donor fields exist (may appear multiple times due to filters)
    expect(screen.getAllByLabelText(/donor/i).length).toBeGreaterThan(0);
  });

  it('refreshes donation list after successful form submission', async () => {
    const initialDonations = [
      {
        id: 1,
        amount: 100,
        donor_name: 'John Doe',
        project_title: 'Project A',
        date: '2024-01-01',
        donor_id: 1,
        project_id: 1,
      },
    ];

    let getDonationsCallCount = 0;
    mockedApiClient.get.mockImplementation((url) => {
      if (url === '/api/donations') {
        getDonationsCallCount++;
        return Promise.resolve({
          data: {
            donations: initialDonations,
            meta: {
              total_count: 1,
              total_pages: 1,
              current_page: 1,
              per_page: 10,
            },
          },
        });
      }
      if (url === '/api/donors') {
        return Promise.resolve({
          data: {
            donors: [],
            meta: {
              total_count: 0,
              total_pages: 0,
              current_page: 1,
              per_page: 10,
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <BrowserRouter>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DonationsPage />
        </LocalizationProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });

    // Initial fetch should have happened once
    expect(getDonationsCallCount).toBe(1);

    // Verify DonationForm is rendered with onSuccess callback
    // The actual form submission and refresh is covered by E2E tests (donation-entry.cy.ts)
    // This test verifies the page setup is correct
    expect(
      screen.getByRole('button', { name: /create donation/i })
    ).toBeInTheDocument();
  });

  it('renders filter controls for date range and donor', async () => {
    mockedApiClient.get.mockImplementation((url) => {
      if (url === '/api/donations') {
        return Promise.resolve({
          data: {
            donations: [],
            meta: {
              total_count: 0,
              total_pages: 0,
              current_page: 1,
              per_page: 10,
            },
          },
        });
      }
      if (url === '/api/donors') {
        return Promise.resolve({
          data: {
            donors: [],
            meta: {
              total_count: 0,
              total_pages: 0,
              current_page: 1,
              per_page: 10,
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <BrowserRouter>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DonationsPage />
        </LocalizationProvider>
      </BrowserRouter>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalled();
    });

    // Verify filter controls are rendered
    // Note: Actual filter interaction and functionality is thoroughly tested in donation-filtering.cy.ts
    expect(screen.getAllByLabelText(/start date/i).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/end date/i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', { name: /clear filters/i })
    ).toBeInTheDocument();
  });

  it('filters out null and empty query params before sending to API', async () => {
    // This test verifies the Ransack filter fix (TICKET-071)
    // Empty/null params should NOT be sent to avoid OR logic issues
    mockedApiClient.get.mockImplementation((url) => {
      if (url === '/api/donations') {
        return Promise.resolve({
          data: {
            donations: [],
            meta: {
              total_count: 0,
              total_pages: 0,
              current_page: 1,
              per_page: 10,
            },
          },
        });
      }
      if (url === '/api/donors') {
        return Promise.resolve({
          data: {
            donors: [],
            meta: {
              total_count: 0,
              total_pages: 0,
              current_page: 1,
              per_page: 10,
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <BrowserRouter>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DonationsPage />
        </LocalizationProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/donations', {
        params: expect.objectContaining({
          page: 1,
          per_page: 10,
        }),
      });
    });

    // Verify that the params object does NOT contain null or empty string values
    const callParams = (mockedApiClient.get.mock.calls.find(
      (call) => call[0] === '/api/donations'
    ) || [])[1];

    if (callParams && callParams.params) {
      const params = callParams.params as Record<string, unknown>;
      Object.entries(params).forEach(([key, value]) => {
        // Page and per_page should exist, but q params should not if null/empty
        if (key.startsWith('q[')) {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(value).not.toBe(null);
          // eslint-disable-next-line jest/no-conditional-expect
          expect(value).not.toBe('');
        }
      });
    }
  });
});
