import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickProjectCreateDialog from './QuickProjectCreateDialog';
import apiClient from '../api/client';

jest.mock('../api/client');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('QuickProjectCreateDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with dialog title "Create New Project"', () => {
    render(
      <QuickProjectCreateDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Create New Project')).toBeInTheDocument();
  });

  it('shows ProjectForm inside dialog', () => {
    render(
      <QuickProjectCreateDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/project type/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create project/i })
    ).toBeInTheDocument();
  });

  it('calls onSuccess with new project when API succeeds', async () => {
    const user = userEvent.setup();
    const mockProject = {
      id: 1,
      title: 'New Project',
      description: 'Test description',
      project_type: 'general',
    };

    mockedApiClient.post.mockResolvedValueOnce({
      data: { project: mockProject },
    } as any);

    render(
      <QuickProjectCreateDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await user.type(screen.getByLabelText(/title/i), 'New Project');
    await user.type(
      screen.getByLabelText(/description/i),
      'Test description'
    );
    await user.click(screen.getByRole('button', { name: /create project/i }));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(mockProject);
    });
  });

  it('closes dialog after successful creation', async () => {
    const user = userEvent.setup();
    const mockProject = {
      id: 2,
      title: 'Another Project',
      description: 'Another description',
      project_type: 'campaign',
    };

    mockedApiClient.post.mockResolvedValueOnce({
      data: { project: mockProject },
    } as any);

    render(
      <QuickProjectCreateDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await user.type(screen.getByLabelText(/title/i), 'Another Project');
    await user.type(
      screen.getByLabelText(/description/i),
      'Another description'
    );
    await user.click(screen.getByRole('button', { name: /create project/i }));

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
          errors: ['Title is required', 'Title is too short'],
        },
      },
    });

    render(
      <QuickProjectCreateDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await user.type(screen.getByLabelText(/title/i), 'A');
    await user.click(screen.getByRole('button', { name: /create project/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Title is required, Title is too short/i)
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
      <QuickProjectCreateDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await user.type(screen.getByLabelText(/title/i), 'Test Project');
    await user.click(screen.getByRole('button', { name: /create project/i }));

    await waitFor(() => {
      expect(screen.getByText(/Internal server error/i)).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('shows close button in dialog title', () => {
    render(
      <QuickProjectCreateDialog
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
      <QuickProjectCreateDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('passes preFillTitle to ProjectForm for pre-filling', () => {
    render(
      <QuickProjectCreateDialog
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        preFillTitle="Christmas Campaign"
      />
    );

    const titleField = screen.getByLabelText(/title/i);
    expect(titleField).toHaveValue('Christmas Campaign');
  });
});
