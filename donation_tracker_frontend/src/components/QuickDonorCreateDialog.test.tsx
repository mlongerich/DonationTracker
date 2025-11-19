import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickDonorCreateDialog from './QuickDonorCreateDialog';
import apiClient from '../api/client';

jest.mock('../api/client');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('QuickDonorCreateDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with dialog title "Create New Donor"', () => {
    render(
      <QuickDonorCreateDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Create New Donor')).toBeInTheDocument();
  });

  it('shows DonorForm inside dialog', () => {
    render(
      <QuickDonorCreateDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('calls onSuccess with new donor when API succeeds', async () => {
    const user = userEvent.setup();
    const mockDonor = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
    };

    mockedApiClient.post.mockResolvedValueOnce({
      data: { donor: mockDonor },
    } as any);

    render(
      <QuickDonorCreateDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(mockDonor);
    });
  });

  it('closes dialog after successful creation', async () => {
    const user = userEvent.setup();
    const mockDonor = {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
    };

    mockedApiClient.post.mockResolvedValueOnce({
      data: { donor: mockDonor },
    } as any);

    render(
      <QuickDonorCreateDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await user.type(screen.getByLabelText(/name/i), 'Jane Smith');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('shows validation error (422) in Snackbar when API returns validation errors', async () => {
    const user = userEvent.setup();

    mockedApiClient.post.mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          errors: ['Email has already been taken', 'Name is too short'],
        },
      },
    });

    render(
      <QuickDonorCreateDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await user.type(screen.getByLabelText(/name/i), 'A');
    await user.type(screen.getByLabelText(/email/i), 'duplicate@example.com');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Email has already been taken, Name is too short/i)
      ).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('shows generic error in Snackbar when API fails with network error', async () => {
    const user = userEvent.setup();

    mockedApiClient.post.mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          error: 'Internal server error',
        },
      },
    });

    render(
      <QuickDonorCreateDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/Internal server error/i)).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('shows Submit button when no pre-fill values', () => {
    render(
      <QuickDonorCreateDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /update/i })
    ).not.toBeInTheDocument();
  });

  it('shows Submit button when pre-filling name', () => {
    render(
      <QuickDonorCreateDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        preFillName="John Doe"
      />
    );

    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /update/i })
    ).not.toBeInTheDocument();
  });

  it('shows close button in dialog title', () => {
    render(
      <QuickDonorCreateDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('close button closes dialog', async () => {
    const user = userEvent.setup();

    render(
      <QuickDonorCreateDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
