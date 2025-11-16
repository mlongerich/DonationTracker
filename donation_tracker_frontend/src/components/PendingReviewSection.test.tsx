import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import PendingReviewSection from './PendingReviewSection';
import apiClient from '../api/client';

jest.mock('../api/client');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      {component}
    </LocalizationProvider>
  );
};

describe('PendingReviewSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        donations: [],
        meta: {
          total_count: 0,
          total_pages: 0,
          current_page: 1,
          per_page: 25,
        },
      },
    });

    renderWithProviders(<PendingReviewSection />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('fetches donations excluding succeeded status', () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        donations: [],
        meta: {
          total_count: 0,
          total_pages: 0,
          current_page: 1,
          per_page: 25,
        },
      },
    });

    renderWithProviders(<PendingReviewSection />);

    expect(mockedApiClient.get).toHaveBeenCalledWith('/api/donations', {
      params: {
        page: 1,
        per_page: 25,
        'q[status_not_eq]': 'succeeded',
      },
    });
  });

  it('renders status filter dropdown', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        donations: [],
        meta: {
          total_count: 0,
          total_pages: 0,
          current_page: 1,
          per_page: 25,
        },
      },
    });

    renderWithProviders(<PendingReviewSection />);

    expect(await screen.findByLabelText(/status/i)).toBeInTheDocument();
  });

  it('filters by status when status filter changes', async () => {
    const user = userEvent.setup();
    mockedApiClient.get.mockResolvedValue({
      data: {
        donations: [],
        meta: {
          total_count: 0,
          total_pages: 0,
          current_page: 1,
          per_page: 25,
        },
      },
    });

    renderWithProviders(<PendingReviewSection />);

    // Wait for initial load
    await screen.findByLabelText(/status/i);

    // Change filter to 'failed'
    const statusSelect = screen.getByLabelText(/status/i);
    await user.click(statusSelect);
    await user.click(screen.getByRole('option', { name: /failed/i }));

    // Should call API with status filter
    expect(mockedApiClient.get).toHaveBeenCalledWith('/api/donations', {
      params: {
        page: 1,
        per_page: 25,
        'q[status_not_eq]': 'succeeded',
        'q[status_eq]': 'failed',
      },
    });
  });

  it('renders from date picker', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        donations: [],
        meta: {
          total_count: 0,
          total_pages: 0,
          current_page: 1,
          per_page: 25,
        },
      },
    });

    renderWithProviders(<PendingReviewSection />);

    // Wait for component to finish loading
    await screen.findByText(/no donations need attention/i);

    expect(
      screen.getByRole('group', { name: /from date/i })
    ).toBeInTheDocument();
  });

  it('filters by from date when date changes', async () => {
    const user = userEvent.setup();
    mockedApiClient.get.mockResolvedValue({
      data: {
        donations: [],
        meta: {
          total_count: 0,
          total_pages: 0,
          current_page: 1,
          per_page: 25,
        },
      },
    });

    renderWithProviders(<PendingReviewSection />);

    // Wait for initial load
    await screen.findByText(/no donations need attention/i);

    // Clear previous calls
    mockedApiClient.get.mockClear();

    // Click the calendar button to open date picker (first one = From Date)
    const calendarButtons = screen.getAllByRole('button', {
      name: /choose date/i,
    });
    await user.click(calendarButtons[0]);

    // Click on a specific day (15th of current month)
    const day15 = await screen.findByRole('gridcell', { name: '15' });
    await user.click(day15);

    // Wait for the API call with the date filter
    await screen.findByText(/no donations need attention/i);

    // Should call API with from date filter
    expect(mockedApiClient.get).toHaveBeenCalledWith(
      '/api/donations',
      expect.objectContaining({
        params: expect.objectContaining({
          'q[date_gteq]': expect.stringMatching(/^\d{4}-\d{2}-15$/),
        }),
      })
    );
  });

  it('renders to date picker', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        donations: [],
        meta: {
          total_count: 0,
          total_pages: 0,
          current_page: 1,
          per_page: 25,
        },
      },
    });

    renderWithProviders(<PendingReviewSection />);

    // Wait for component to finish loading
    await screen.findByText(/no donations need attention/i);

    expect(screen.getByRole('group', { name: /to date/i })).toBeInTheDocument();
  });

  it('filters by to date when date changes', async () => {
    const user = userEvent.setup();
    mockedApiClient.get.mockResolvedValue({
      data: {
        donations: [],
        meta: {
          total_count: 0,
          total_pages: 0,
          current_page: 1,
          per_page: 25,
        },
      },
    });

    renderWithProviders(<PendingReviewSection />);

    // Wait for initial load
    await screen.findByText(/no donations need attention/i);

    // Clear previous calls
    mockedApiClient.get.mockClear();

    // Click the calendar button to open date picker (second one = To Date)
    const calendarButtons = screen.getAllByRole('button', {
      name: /choose date/i,
    });
    await user.click(calendarButtons[1]);

    // Click on a specific day (20th of current month)
    const day20 = await screen.findByRole('gridcell', { name: '20' });
    await user.click(day20);

    // Wait for the API call with the date filter
    await screen.findByText(/no donations need attention/i);

    // Should call API with to date filter
    expect(mockedApiClient.get).toHaveBeenCalledWith(
      '/api/donations',
      expect.objectContaining({
        params: expect.objectContaining({
          'q[date_lteq]': expect.stringMatching(/^\d{4}-\d{2}-20$/),
        }),
      })
    );
  });
});
