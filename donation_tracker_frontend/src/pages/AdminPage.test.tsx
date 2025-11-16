import { render, screen } from '@testing-library/react';
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

  it('renders CSV Import tab', () => {
    renderWithProviders(<AdminPage />);
    expect(
      screen.getByRole('tab', { name: /csv import/i })
    ).toBeInTheDocument();
  });

  it('renders PendingReviewSection in first tab', async () => {
    renderWithProviders(<AdminPage />);
    // PendingReviewSection should fetch and show empty state
    expect(
      await screen.findByText(/no donations need attention/i)
    ).toBeInTheDocument();
  });
});
