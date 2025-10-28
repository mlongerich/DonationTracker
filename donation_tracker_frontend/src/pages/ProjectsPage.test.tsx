import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectsPage from './ProjectsPage';
import { fetchProjects, createProject, updateProject, deleteProject } from '../api/client';
import apiClient from '../api/client';

jest.mock('../api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
  fetchProjects: jest.fn(),
  createProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('ProjectsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchProjects as jest.Mock).mockResolvedValue({ projects: [] });
  });

  it('renders page title', () => {
    render(<ProjectsPage />);

    expect(screen.getByRole('heading', { name: /manage projects/i })).toBeInTheDocument();
  });

  it('renders project form', () => {
    render(<ProjectsPage />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it('renders empty project list', () => {
    render(<ProjectsPage />);

    expect(screen.getByText(/no projects/i)).toBeInTheDocument();
  });

  it('fetches projects on mount', async () => {
    const mockProjects = [
      { id: 1, title: 'Summer Campaign', project_type: 'campaign', system: false },
    ];

    mockedApiClient.get.mockResolvedValue({
      data: { projects: mockProjects },
    });

    render(<ProjectsPage />);

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/projects', { params: {} });
    });
  });

  it('calls createProject when form submitted', async () => {
    (createProject as jest.Mock).mockResolvedValue({});

    const user = userEvent.setup();
    render(<ProjectsPage />);

    await user.type(screen.getByLabelText(/title/i), 'New Project');
    await user.click(screen.getByRole('button', { name: /create project/i }));

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledWith({
        title: 'New Project',
        description: '',
        project_type: 'general',
      });
    });
  });

  it('passes editing project to ProjectForm when edit button clicked', async () => {
    const mockProjects = [
      { id: 1, title: 'Summer Campaign', description: 'Test', project_type: 'campaign', system: false },
    ];

    mockedApiClient.get.mockResolvedValue({
      data: { projects: mockProjects },
    });

    const user = userEvent.setup();
    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Summer Campaign')).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    // Verify form is pre-filled with project data
    expect(screen.getByLabelText(/title/i)).toHaveValue('Summer Campaign');
  });

  it('calls updateProject when editing project and form submitted', async () => {
    const mockProjects = [
      { id: 1, title: 'Summer Campaign', description: 'Test', project_type: 'campaign', system: false },
    ];

    mockedApiClient.get.mockResolvedValue({
      data: { projects: mockProjects },
    });
    (updateProject as jest.Mock).mockResolvedValue({});
    (fetchProjects as jest.Mock).mockResolvedValue({
      projects: mockProjects,
    });

    const user = userEvent.setup();
    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Summer Campaign')).toBeInTheDocument();
    });

    // Click edit
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    // Modify title
    const titleInput = screen.getByLabelText(/title/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Campaign');

    // Submit
    await user.click(screen.getByRole('button', { name: /update project/i }));

    await waitFor(() => {
      expect(updateProject).toHaveBeenCalledWith(1, {
        title: 'Updated Campaign',
        description: 'Test',
        project_type: 'campaign',
      });
    });
  });

  it('renders with MUI Container and spacing', () => {
    const { container } = render(<ProjectsPage />);

    // Check for MUI Container class
    const muiContainer = container.querySelector('.MuiContainer-root');
    expect(muiContainer).toBeInTheDocument();
  });

  it('clears form fields after successful project creation', async () => {
    (createProject as jest.Mock).mockResolvedValue({});
    (fetchProjects as jest.Mock).mockResolvedValue({ projects: [] });

    const user = userEvent.setup();
    render(<ProjectsPage />);

    // Fill form
    await user.type(screen.getByLabelText(/title/i), 'New Project');
    await user.type(screen.getByLabelText(/description/i), 'Test description');

    // Submit
    await user.click(screen.getByRole('button', { name: /create project/i }));

    // Wait for submission
    await waitFor(() => {
      expect(createProject).toHaveBeenCalled();
    });

    // Verify form is cleared
    expect(screen.getByLabelText(/title/i)).toHaveValue('');
    expect(screen.getByLabelText(/description/i)).toHaveValue('');
  });

  it('displays success Alert after creating project', async () => {
    (createProject as jest.Mock).mockResolvedValue({});
    (fetchProjects as jest.Mock).mockResolvedValue({ projects: [] });

    const user = userEvent.setup();
    render(<ProjectsPage />);

    await user.type(screen.getByLabelText(/title/i), 'New Project');
    await user.click(screen.getByRole('button', { name: /create project/i }));

    await waitFor(() => {
      expect(screen.getByText(/project created successfully/i)).toBeInTheDocument();
    });
  });

  it('calls deleteProject when Delete button clicked', async () => {
    const mockProjects = [
      { id: 1, title: 'Summer Campaign', description: 'Test', project_type: 'campaign', system: false, can_be_deleted: true },
    ];

    mockedApiClient.get.mockResolvedValue({
      data: { projects: mockProjects },
    });
    (deleteProject as jest.Mock).mockResolvedValue({});
    (fetchProjects as jest.Mock).mockResolvedValue({
      projects: mockProjects,
    });

    const user = userEvent.setup();
    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Summer Campaign')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(deleteProject).toHaveBeenCalledWith(1);
    });
  });

  it('fetches projects with include_discarded param when showArchived is checked', async () => {
    const user = userEvent.setup();

    mockedApiClient.get.mockResolvedValue({
      data: { projects: [] }
    });
    (fetchProjects as jest.Mock).mockResolvedValue({ projects: [] });

    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/show archived projects/i)).toBeInTheDocument();
    });

    // Click the checkbox
    const checkbox = screen.getByLabelText(/show archived projects/i);
    await user.click(checkbox);

    // Verify API called with include_discarded param
    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/projects', {
        params: { include_discarded: 'true' }
      });
    });
  });

  it('refreshes project list after creating project without including archived projects', async () => {
    const user = userEvent.setup();
    const newProject = { id: 2, title: 'New Project', project_type: 'general', system: false };

    (createProject as jest.Mock).mockResolvedValue({});

    // First call on mount
    mockedApiClient.get.mockResolvedValueOnce({
      data: { projects: [] }
    });

    // Second call after creating project
    mockedApiClient.get.mockResolvedValueOnce({
      data: { projects: [newProject] }
    });

    render(<ProjectsPage />);

    // Create project
    await user.type(screen.getByLabelText(/title/i), 'New Project');
    await user.click(screen.getByRole('button', { name: /create project/i }));

    // Verify API refresh called WITHOUT include_discarded (showArchived=false by default)
    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/projects', { params: {} });
      expect(mockedApiClient.get).toHaveBeenCalledTimes(2); // mount + refresh
    });

    // Verify new project appears in list
    expect(screen.getByText('New Project')).toBeInTheDocument();
  });

  describe('Archive error handling', () => {
    it('shows error snackbar when archive fails with 422', async () => {
      const user = userEvent.setup();
      const mockProjects = [
        { id: 1, title: 'Summer Campaign', project_type: 'campaign', system: false, can_be_deleted: true },
      ];

      mockedApiClient.get.mockResolvedValue({
        data: { projects: mockProjects },
      });

      mockedApiClient.post.mockRejectedValue({
        response: {
          status: 422,
          data: { errors: ['Cannot archive project with active sponsorships'] },
        },
      });

      render(<ProjectsPage />);

      await waitFor(() => {
        expect(screen.getByText('Summer Campaign')).toBeInTheDocument();
      });

      // Click archive button
      const archiveButton = screen.getByRole('button', { name: /archive/i });
      await user.click(archiveButton);

      // Error snackbar should appear with message
      await waitFor(() => {
        expect(screen.getByText('Cannot archive project with active sponsorships')).toBeInTheDocument();
      });
    });

    it('displays generic error message when API error has no details', async () => {
      const user = userEvent.setup();
      const mockProjects = [
        { id: 1, title: 'Summer Campaign', project_type: 'campaign', system: false, can_be_deleted: true },
      ];

      mockedApiClient.get.mockResolvedValue({
        data: { projects: mockProjects },
      });

      mockedApiClient.post.mockRejectedValue({
        response: {
          status: 422,
          data: {},
        },
      });

      render(<ProjectsPage />);

      await waitFor(() => {
        expect(screen.getByText('Summer Campaign')).toBeInTheDocument();
      });

      // Click archive button
      const archiveButton = screen.getByRole('button', { name: /archive/i });
      await user.click(archiveButton);

      // Error snackbar should appear with generic message
      await waitFor(() => {
        expect(screen.getByText('Failed to archive project')).toBeInTheDocument();
      });
    });

    it('error snackbar closes when user clicks close button', async () => {
      const user = userEvent.setup();
      const mockProjects = [
        { id: 1, title: 'Summer Campaign', project_type: 'campaign', system: false, can_be_deleted: true },
      ];

      mockedApiClient.get.mockResolvedValue({
        data: { projects: mockProjects },
      });

      mockedApiClient.post.mockRejectedValue({
        response: {
          status: 422,
          data: { errors: ['Cannot archive project with active sponsorships'] },
        },
      });

      render(<ProjectsPage />);

      await waitFor(() => {
        expect(screen.getByText('Summer Campaign')).toBeInTheDocument();
      });

      // Click archive button
      const archiveButton = screen.getByRole('button', { name: /archive/i });
      await user.click(archiveButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('Cannot archive project with active sponsorships')).toBeInTheDocument();
      });

      // Click close button on snackbar
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Error should be removed
      await waitFor(() => {
        expect(screen.queryByText('Cannot archive project with active sponsorships')).not.toBeInTheDocument();
      });
    });
  });
});
