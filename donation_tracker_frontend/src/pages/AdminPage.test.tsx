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

  it('renders Stripe CSV import section in CSV tab', async () => {
    const user = userEvent.setup({ delay: null });

    renderWithProviders(<AdminPage />);

    const csvTab = screen.getByRole('tab', { name: /^csv$/i });
    await user.click(csvTab);

    expect(
      screen.getByRole('heading', { name: /stripe csv import/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/import creates both donors and donations/i)
    ).toBeInTheDocument();
  });

  it('shows selected filename when file is chosen', async () => {
    const user = userEvent.setup({ delay: null });

    renderWithProviders(<AdminPage />);

    const csvTab = screen.getByRole('tab', { name: /^csv$/i });
    await user.click(csvTab);

    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const input = document.querySelector(
      '#csv-file-input'
    ) as HTMLInputElement;
    await user.upload(input, file);

    expect(screen.getByText(/selected: test.csv/i)).toBeInTheDocument();
  });

  it('upload button is disabled when no file is selected', async () => {
    const user = userEvent.setup({ delay: null });

    renderWithProviders(<AdminPage />);

    const csvTab = screen.getByRole('tab', { name: /^csv$/i });
    await user.click(csvTab);

    const uploadButton = screen.getByRole('button', {
      name: /import stripe csv/i,
    });
    expect(uploadButton).toBeDisabled();
  });

  it('calls API with FormData when upload button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    mockedApiClient.post.mockResolvedValue({
      data: {
        success_count: 3,
        skipped_count: 1,
        failed_count: 0,
        needs_attention_count: 1,
        errors: [],
      },
    });

    renderWithProviders(<AdminPage />);

    const csvTab = screen.getByRole('tab', { name: /^csv$/i });
    await user.click(csvTab);

    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const input = document.querySelector(
      '#csv-file-input'
    ) as HTMLInputElement;
    await user.upload(input, file);

    const uploadButton = screen.getByRole('button', {
      name: /import stripe csv/i,
    });
    await user.click(uploadButton);

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/api/admin/import/stripe_payments',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
  });

  it('displays success counts after successful upload', async () => {
    const user = userEvent.setup({ delay: null });
    mockedApiClient.post.mockResolvedValue({
      data: {
        success_count: 3,
        skipped_count: 1,
        failed_count: 2,
        needs_attention_count: 1,
        errors: [],
      },
    });

    renderWithProviders(<AdminPage />);

    const csvTab = screen.getByRole('tab', { name: /^csv$/i });
    await user.click(csvTab);

    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const input = document.querySelector(
      '#csv-file-input'
    ) as HTMLInputElement;
    await user.upload(input, file);

    const uploadButton = screen.getByRole('button', {
      name: /import stripe csv/i,
    });
    await user.click(uploadButton);

    expect(
      await screen.findByText(/succeeded: 3 donations/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/skipped: 1 duplicates/i)).toBeInTheDocument();
    expect(
      screen.getByText(/needs attention: 1 donations/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/failed: 2 donations/i)).toBeInTheDocument();
  });

  it('clear button resets form state', async () => {
    const user = userEvent.setup({ delay: null });
    mockedApiClient.post.mockResolvedValue({
      data: {
        success_count: 3,
        skipped_count: 0,
        failed_count: 0,
        needs_attention_count: 0,
        errors: [],
      },
    });

    renderWithProviders(<AdminPage />);

    const csvTab = screen.getByRole('tab', { name: /^csv$/i });
    await user.click(csvTab);

    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const input = document.querySelector(
      '#csv-file-input'
    ) as HTMLInputElement;
    await user.upload(input, file);

    const uploadButton = screen.getByRole('button', {
      name: /import stripe csv/i,
    });
    await user.click(uploadButton);

    expect(
      await screen.findByText(/succeeded: 3 donations/i)
    ).toBeInTheDocument();

    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);

    expect(
      screen.queryByText(/succeeded: 3 donations/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/selected:/i)).not.toBeInTheDocument();
  });

  it('shows loading text while import is in progress', async () => {
    const user = userEvent.setup({ delay: null });
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockedApiClient.post.mockReturnValue(promise as any);

    renderWithProviders(<AdminPage />);

    const csvTab = screen.getByRole('tab', { name: /^csv$/i });
    await user.click(csvTab);

    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const input = document.querySelector(
      '#csv-file-input'
    ) as HTMLInputElement;
    await user.upload(input, file);

    const uploadButton = screen.getByRole('button', {
      name: /import stripe csv/i,
    });
    await user.click(uploadButton);

    expect(screen.getByText(/importing\.\.\./i)).toBeInTheDocument();

    resolvePromise!({
      data: {
        success_count: 1,
        skipped_count: 0,
        failed_count: 0,
        needs_attention_count: 0,
        errors: [],
      },
    });
  });

  it('displays error message when API call fails', async () => {
    const user = userEvent.setup({ delay: null });
    mockedApiClient.post.mockRejectedValue({
      response: {
        data: {
          error: 'Import failed: Invalid CSV format',
        },
      },
    });

    renderWithProviders(<AdminPage />);

    const csvTab = screen.getByRole('tab', { name: /^csv$/i });
    await user.click(csvTab);

    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const input = document.querySelector(
      '#csv-file-input'
    ) as HTMLInputElement;
    await user.upload(input, file);

    const uploadButton = screen.getByRole('button', {
      name: /import stripe csv/i,
    });
    await user.click(uploadButton);

    expect(
      await screen.findByText(/import failed: invalid csv format/i)
    ).toBeInTheDocument();
  });
});
