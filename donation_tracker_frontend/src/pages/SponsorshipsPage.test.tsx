import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SponsorshipsPage from './SponsorshipsPage';
import apiClient from '../api/client';

jest.mock('../api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('SponsorshipsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the page heading', () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        sponsorships: [],
        meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 25 },
      },
    });
    render(<SponsorshipsPage />);
    expect(screen.getByRole('heading', { name: /sponsorships/i })).toBeInTheDocument();
  });

  it('fetches sponsorships on mount', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        sponsorships: [],
        meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 25 },
      },
    });
    render(<SponsorshipsPage />);
    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/sponsorships', { params: { page: 1, per_page: 25 } });
    });
  });

  it('displays sponsorship list', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        sponsorships: [
          { id: 1, donor_name: 'John Doe', child_name: 'Alice', monthly_amount: 50, active: true },
        ],
        meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 25 },
      },
    });
    render(<SponsorshipsPage />);
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  it('ends a sponsorship', async () => {
    const user = userEvent.setup();
    mockedApiClient.get.mockResolvedValue({
      data: {
        sponsorships: [
          { id: 1, donor_name: 'John Doe', child_name: 'Alice', monthly_amount: 50, active: true },
        ],
        meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 25 },
      },
    });
    mockedApiClient.delete.mockResolvedValue({ data: {} });

    render(<SponsorshipsPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const endButton = screen.getByRole('button', { name: /end/i });
    await user.click(endButton);

    await waitFor(() => {
      expect(mockedApiClient.delete).toHaveBeenCalledWith('/api/sponsorships/1');
    });
  });

  it('creates a new sponsorship from the page', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        sponsorships: [],
        meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 25 },
      },
    });
    mockedApiClient.post.mockResolvedValue({
      data: {
        id: 1,
        donor_id: 1,
        child_id: 1,
        monthly_amount: 50,
      },
    });

    render(<SponsorshipsPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create new sponsorship/i })).toBeInTheDocument();
    });
  });
});
