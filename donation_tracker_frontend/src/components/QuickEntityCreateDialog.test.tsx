import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickEntityCreateDialog from './QuickEntityCreateDialog';
import apiClient from '../api/client';

jest.mock('../api/client');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('QuickEntityCreateDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnProjectCreated = jest.fn();
  const mockOnChildCreated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Child Tab Tests', () => {
    it('opens with child tab by default', () => {
      render(
        <QuickEntityCreateDialog
          open={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
        />
      );

      // Child tab should be selected by default
      const childTab = screen.getByRole('tab', { name: /create child/i });
      expect(childTab).toHaveAttribute('aria-selected', 'true');
    });

    it('renders child form when on child tab', () => {
      render(
        <QuickEntityCreateDialog
          open={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
        />
      );

      // ChildForm should be visible (has name and gender fields)
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/gender/i)).toBeInTheDocument();
    });

    it('calls onChildCreated with new child when API succeeds', async () => {
      const user = userEvent.setup();
      const mockChild = {
        id: 1,
        name: 'John Doe',
        gender: 'boy',
      };

      mockedApiClient.post.mockResolvedValueOnce({
        data: { child: mockChild },
      } as any);

      render(
        <QuickEntityCreateDialog
          open={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
        />
      );

      await user.type(screen.getByLabelText(/name/i), 'John Doe');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(mockOnChildCreated).toHaveBeenCalledWith(mockChild);
      });
    });

    it('closes dialog after successful child creation', async () => {
      const user = userEvent.setup();
      const mockChild = {
        id: 2,
        name: 'Jane Doe',
        gender: 'girl',
      };

      mockedApiClient.post.mockResolvedValueOnce({
        data: { child: mockChild },
      } as any);

      render(
        <QuickEntityCreateDialog
          open={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
        />
      );

      await user.type(screen.getByLabelText(/name/i), 'Jane Doe');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('shows validation error (422) in Snackbar when child API returns validation errors', async () => {
      const user = userEvent.setup();

      mockedApiClient.post.mockRejectedValueOnce({
        response: {
          status: 422,
          data: {
            errors: ['Name is required', 'Name is too short'],
          },
        },
      });

      render(
        <QuickEntityCreateDialog
          open={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
        />
      );

      await user.type(screen.getByLabelText(/name/i), 'A');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/Name is required, Name is too short/i)
        ).toBeInTheDocument();
      });

      expect(mockOnChildCreated).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('shows network error in Snackbar when child API fails', async () => {
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
        <QuickEntityCreateDialog
          open={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
        />
      );

      await user.type(screen.getByLabelText(/name/i), 'Test Child');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByText(/Internal server error/i)).toBeInTheDocument();
      });

      expect(mockOnChildCreated).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('pre-fills child name from preFillText prop', () => {
      render(
        <QuickEntityCreateDialog
          open={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
          preFillText="Sarah Smith"
        />
      );

      const nameField = screen.getByLabelText(/name/i);
      expect(nameField).toHaveValue('Sarah Smith');
    });

    it('shows close button in dialog title', () => {
      render(
        <QuickEntityCreateDialog
          open={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
        />
      );

      expect(
        screen.getByRole('button', { name: /close/i })
      ).toBeInTheDocument();
    });

    it('close button closes dialog', async () => {
      const user = userEvent.setup();

      render(
        <QuickEntityCreateDialog
          open={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Project Tab Tests', () => {
    it('renders project form when switching to project tab', async () => {
      const user = userEvent.setup();

      render(
        <QuickEntityCreateDialog
          open={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
        />
      );

      // Switch to project tab
      const projectTab = screen.getByRole('tab', { name: /create project/i });
      await user.click(projectTab);

      // ProjectForm should be visible (has title, description, project type fields)
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/project type/i)).toBeInTheDocument();
    });

    it('calls onProjectCreated with new project when API succeeds', async () => {
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
        <QuickEntityCreateDialog
          open={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
        />
      );

      // Switch to project tab
      const projectTab = screen.getByRole('tab', { name: /create project/i });
      await user.click(projectTab);

      // Wait for project form to be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/title/i), 'New Project');

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnProjectCreated).toHaveBeenCalledWith(mockProject);
      });
    });

    it('closes dialog after successful project creation', async () => {
      const user = userEvent.setup();
      const mockProject = {
        id: 2,
        title: 'Another Project',
        description: 'Test',
        project_type: 'campaign',
      };

      mockedApiClient.post.mockResolvedValueOnce({
        data: { project: mockProject },
      } as any);

      render(
        <QuickEntityCreateDialog
          open={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
        />
      );

      // Switch to project tab
      const projectTab = screen.getByRole('tab', { name: /create project/i });
      await user.click(projectTab);

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/title/i), 'Another Project');
      await user.click(screen.getByRole('button', { name: /create project/i }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('shows validation error (422) in Snackbar when project API returns validation errors', async () => {
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
        <QuickEntityCreateDialog
          open={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
        />
      );

      // Switch to project tab
      const projectTab = screen.getByRole('tab', { name: /create project/i });
      await user.click(projectTab);

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/title/i), 'A');
      await user.click(screen.getByRole('button', { name: /create project/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/Title is required, Title is too short/i)
        ).toBeInTheDocument();
      });

      expect(mockOnProjectCreated).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('shows network error in Snackbar when project API fails', async () => {
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
        <QuickEntityCreateDialog
          open={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
        />
      );

      // Switch to project tab
      const projectTab = screen.getByRole('tab', { name: /create project/i });
      await user.click(projectTab);

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/title/i), 'Test Project');
      await user.click(screen.getByRole('button', { name: /create project/i }));

      await waitFor(() => {
        expect(screen.getByText(/Internal server error/i)).toBeInTheDocument();
      });

      expect(mockOnProjectCreated).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('pre-fills project title from preFillText prop', async () => {
      const user = userEvent.setup();

      render(
        <QuickEntityCreateDialog
          open={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
          preFillText="New Campaign"
        />
      );

      // Switch to project tab
      const projectTab = screen.getByRole('tab', { name: /create project/i });
      await user.click(projectTab);

      await waitFor(() => {
        const titleField = screen.getByLabelText(/title/i);
        expect(titleField).toHaveValue('New Campaign');
      });
    });
  });

  describe('Tab Switching and Error Isolation Tests', () => {
    it('clears project error when switching away from project tab', async () => {
      const user = userEvent.setup();

      // Mock API to return error
      mockedApiClient.post.mockRejectedValueOnce({
        response: {
          status: 422,
          data: {
            errors: ['Title is required'],
          },
        },
      });

      render(
        <QuickEntityCreateDialog
          open={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
        />
      );

      // Switch to project tab
      const projectTab = screen.getByRole('tab', { name: /create project/i });
      await user.click(projectTab);

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      // Submit to trigger error
      await user.type(screen.getByLabelText(/title/i), 'A');
      await user.click(screen.getByRole('button', { name: /create project/i }));

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/Title is required/i)).toBeInTheDocument();
      });

      // Verify error is visible
      expect(screen.getByText(/Title is required/i)).toBeInTheDocument();

      // Switch to child tab
      const childTab = screen.getByRole('tab', { name: /create child/i });
      await user.click(childTab);

      // Error should be cleared when switching away from project tab
      expect(screen.queryByText(/Title is required/i)).not.toBeInTheDocument();
    });

    it('clears child error when switching away from child tab', async () => {
      const user = userEvent.setup();

      // Mock API to return error
      mockedApiClient.post.mockRejectedValueOnce({
        response: {
          status: 422,
          data: {
            errors: ['Name is required'],
          },
        },
      });

      render(
        <QuickEntityCreateDialog
          open={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
        />
      );

      // Child tab is default - submit to trigger error
      await user.type(screen.getByLabelText(/name/i), 'A');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
      });

      // Switch to project tab
      const projectTab = screen.getByRole('tab', { name: /create project/i });
      await user.click(projectTab);

      // Error should be cleared when switching away from child tab
      expect(screen.queryByText(/Name is required/i)).not.toBeInTheDocument();
    });

    it('preserves child form state when switching to project tab and back', async () => {
      const user = userEvent.setup();

      render(
        <QuickEntityCreateDialog
          open={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
        />
      );

      // Fill in child form
      await user.type(screen.getByLabelText(/name/i), 'Test Child');

      // Switch to project tab
      const projectTab = screen.getByRole('tab', { name: /create project/i });
      await user.click(projectTab);

      // Switch back to child tab
      const childTab = screen.getByRole('tab', { name: /create child/i });
      await user.click(childTab);

      // Child form state should be preserved
      expect(screen.getByLabelText(/name/i)).toHaveValue('Test Child');
    });

    it('preserves project form state when switching to child tab and back', async () => {
      const user = userEvent.setup();

      render(
        <QuickEntityCreateDialog
          open={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
        />
      );

      // Switch to project tab
      const projectTab = screen.getByRole('tab', { name: /create project/i });
      await user.click(projectTab);

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      // Fill in project form
      await user.type(screen.getByLabelText(/title/i), 'Test Project');
      await user.type(
        screen.getByLabelText(/description/i),
        'Test Description'
      );

      // Switch to child tab
      const childTab = screen.getByRole('tab', { name: /create child/i });
      await user.click(childTab);

      // Switch back to project tab
      await user.click(projectTab);

      // Project form state should be preserved
      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toHaveValue('Test Project');
      });
      expect(screen.getByLabelText(/description/i)).toHaveValue(
        'Test Description'
      );
    });

    it('resets all form state when dialog closes and reopens', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <QuickEntityCreateDialog
          open={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
        />
      );

      // Fill in child form
      await user.type(screen.getByLabelText(/name/i), 'Test Child');

      // Switch to project tab and fill
      const projectTab = screen.getByRole('tab', { name: /create project/i });
      await user.click(projectTab);

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/title/i), 'Test Project');

      // Close dialog
      rerender(
        <QuickEntityCreateDialog
          open={false}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
        />
      );

      // Reopen dialog
      rerender(
        <QuickEntityCreateDialog
          open={true}
          onClose={mockOnClose}
          onProjectCreated={mockOnProjectCreated}
          onChildCreated={mockOnChildCreated}
        />
      );

      // Child form should be reset (default tab)
      expect(screen.getByLabelText(/name/i)).toHaveValue('');

      // Project form should also be reset
      await user.click(projectTab);
      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toHaveValue('');
      });
    });
  });
});
