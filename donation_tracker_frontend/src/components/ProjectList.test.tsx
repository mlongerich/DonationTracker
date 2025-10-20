import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectList from './ProjectList';

describe('ProjectList', () => {
  it('renders empty state when no projects', () => {
    render(<ProjectList projects={[]} />);

    expect(screen.getByText(/no projects/i)).toBeInTheDocument();
  });

  it('empty state should use Material-UI Typography with centered layout', () => {
    render(<ProjectList projects={[]} />);

    const emptyMessage = screen.getByText(/no projects/i);
    expect(emptyMessage).toHaveClass('MuiTypography-root');

    // Verify it's wrapped in a Box (parent element)
    const boxWrapper = emptyMessage.closest('.MuiBox-root');
    expect(boxWrapper).toBeInTheDocument();
  });

  it('renders project title', () => {
    const projects = [
      {
        id: 1,
        title: 'Summer Campaign',
        description: 'A summer fundraising campaign',
        project_type: 'campaign' as const,
        system: false,
      },
    ];

    render(<ProjectList projects={projects} />);

    expect(screen.getByText(/Summer Campaign/i)).toBeInTheDocument();
  });

  it('each project should be rendered as a Material-UI Card', () => {
    const projects = [
      {
        id: 1,
        title: 'Summer Campaign',
        project_type: 'campaign' as const,
        system: false,
      },
    ];

    const { container } = render(<ProjectList projects={projects} />);

    const card = container.querySelector('.MuiCard-root');
    expect(card).toBeInTheDocument();
  });

  it('renders edit button for non-system projects', () => {
    const projects = [
      {
        id: 1,
        title: 'Summer Campaign',
        project_type: 'campaign' as const,
        system: false,
      },
    ];

    render(<ProjectList projects={projects} />);

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('edit button should be a Material-UI IconButton', () => {
    const projects = [
      {
        id: 1,
        title: 'Summer Campaign',
        project_type: 'campaign' as const,
        system: false,
      },
    ];

    render(<ProjectList projects={projects} />);

    const editButton = screen.getByLabelText(/edit/i);
    expect(editButton).toHaveClass('MuiIconButton-root');
  });

  it('renders delete button for non-system projects', () => {
    const projects = [
      {
        id: 1,
        title: 'Summer Campaign',
        project_type: 'campaign' as const,
        system: false,
      },
    ];

    render(<ProjectList projects={projects} />);

    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('does not render edit/delete buttons for system projects', () => {
    const projects = [
      {
        id: 1,
        title: 'General Donation',
        project_type: 'general' as const,
        system: true,
      },
    ];

    render(<ProjectList projects={projects} />);

    expect(
      screen.queryByRole('button', { name: /edit/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /delete/i })
    ).not.toBeInTheDocument();
  });

  it('calls onEdit with project when Edit button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnEdit = jest.fn();
    const projects = [
      {
        id: 1,
        title: 'Summer Campaign',
        project_type: 'campaign' as const,
        system: false,
      },
    ];

    render(<ProjectList projects={projects} onEdit={mockOnEdit} />);

    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(projects[0]);
  });

  it('calls onDelete with project when Delete button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnDelete = jest.fn();
    const projects = [
      {
        id: 1,
        title: 'Summer Campaign',
        project_type: 'campaign' as const,
        system: false,
      },
    ];

    render(<ProjectList projects={projects} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(projects[0]);
  });
});
