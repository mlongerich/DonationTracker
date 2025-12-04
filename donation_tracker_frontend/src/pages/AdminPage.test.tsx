import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AdminPage from './AdminPage';
import apiClient from '../api/client';

jest.mock('../api/client');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {component}
      </LocalizationProvider>
    </BrowserRouter>
  );
};

describe('AdminPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
  });

  it('renders admin title', () => {
    renderWithProviders(<AdminPage />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders Pending Review tab', () => {
    renderWithProviders(<AdminPage />);
    expect(
      screen.getByRole('tab', { name: /pending review/i })
    ).toBeInTheDocument();
  });

  it('renders CSV tab', () => {
    renderWithProviders(<AdminPage />);
    expect(screen.getByRole('tab', { name: /^csv$/i })).toBeInTheDocument();
  });

  it('renders PendingReviewSection in first tab', async () => {
    renderWithProviders(<AdminPage />);
    // PendingReviewSection should fetch and show empty state
    expect(
      await screen.findByText(/no donations need attention/i)
    ).toBeInTheDocument();
  });

  it('renders Export Donors button in CSV tab', async () => {
    const user = userEvent.setup({ delay: null });

    renderWithProviders(<AdminPage />);

    const csvTab = screen.getByRole('tab', { name: /^csv$/i });
    await user.click(csvTab);

    expect(
      screen.getByRole('button', { name: /export all donors to csv/i })
    ).toBeInTheDocument();
  });

  it('calls export API when Export button is clicked', async () => {
    const user = userEvent.setup({ delay: null });

    renderWithProviders(<AdminPage />);

    const csvTab = screen.getByRole('tab', { name: /^csv$/i });
    await user.click(csvTab);

    const exportButton = screen.getByRole('button', {
      name: /export all donors to csv/i,
    });
    await user.click(exportButton);

    expect(mockedApiClient.get).toHaveBeenCalledWith(
      '/api/donors/export',
      expect.objectContaining({
        params: expect.objectContaining({
          include_discarded: false,
        }),
        responseType: 'blob',
      })
    );
  });
});
