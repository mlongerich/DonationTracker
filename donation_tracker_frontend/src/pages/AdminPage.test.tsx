import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AdminPage from './AdminPage';
import apiClient from '../api/client';
import * as hooks from '../hooks';

jest.mock('../api/client');
jest.mock('../hooks');
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

    // Mock useProjects hook for ProjectsSection
    (hooks.useProjects as jest.Mock).mockReturnValue({
      projects: [],
      loading: false,
      error: null,
      paginationMeta: null,
      fetchProjects: jest.fn(),
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

  it('renders Projects tab', () => {
    renderWithProviders(<AdminPage />);
    expect(
      screen.getByRole('tab', { name: /projects/i })
    ).toBeInTheDocument();
  });

  it('shows ProjectsSection when Projects tab is clicked', async () => {
    const user = userEvent.setup({ delay: null });

    renderWithProviders(<AdminPage />);

    const projectsTab = screen.getByRole('tab', { name: /projects/i });
    await user.click(projectsTab);

    // ProjectsSection should render with its headings (using heading role to be specific)
    expect(
      screen.getByRole('heading', { name: /create project/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /project list/i })
    ).toBeInTheDocument();
  });
});
