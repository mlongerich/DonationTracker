import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectsPage from './ProjectsPage';
import { fetchProjects, createProject, updateProject, deleteProject } from '../api/client';

jest.mock('../api/client', () => ({
  fetchProjects: jest.fn(),
  createProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
}));

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

    (fetchProjects as jest.Mock).mockResolvedValue({
      projects: mockProjects,
    });

    render(<ProjectsPage />);

    await waitFor(() => {
      expect(fetchProjects).toHaveBeenCalled();
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

    (fetchProjects as jest.Mock).mockResolvedValue({
      projects: mockProjects,
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

    (fetchProjects as jest.Mock).mockResolvedValue({
      projects: mockProjects,
    });
    (updateProject as jest.Mock).mockResolvedValue({});

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
      { id: 1, title: 'Summer Campaign', description: 'Test', project_type: 'campaign', system: false },
    ];

    (fetchProjects as jest.Mock).mockResolvedValue({
      projects: mockProjects,
    });
    (deleteProject as jest.Mock).mockResolvedValue({});

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
});
