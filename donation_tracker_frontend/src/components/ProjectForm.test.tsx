import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectForm from './ProjectForm';

describe('ProjectForm', () => {
  it('renders title input field', () => {
    render(<ProjectForm onSubmit={jest.fn()} />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it('renders description input field', () => {
    render(<ProjectForm onSubmit={jest.fn()} />);

    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('renders project type select', () => {
    render(<ProjectForm onSubmit={jest.fn()} />);

    expect(screen.getByLabelText(/project type/i)).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<ProjectForm onSubmit={jest.fn()} />);

    expect(
      screen.getByRole('button', { name: /create project/i })
    ).toBeInTheDocument();
  });

  it('calls onSubmit with form data when submitted', async () => {
    const mockOnSubmit = jest.fn();
    const user = userEvent.setup();

    render(<ProjectForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/title/i), 'Summer Campaign');
    await user.type(
      screen.getByLabelText(/description/i),
      'A summer fundraiser'
    );
    await user.click(screen.getByRole('button', { name: /create project/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'Summer Campaign',
      description: 'A summer fundraiser',
      project_type: 'general',
    });
  });

  it('renders form fields', () => {
    render(<ProjectForm onSubmit={jest.fn()} />);

    // Verify form renders with expected fields
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/project type/i)).toBeInTheDocument();
  });

  it('pre-fills title field when initialTitle is provided', () => {
    render(
      <ProjectForm onSubmit={jest.fn()} initialTitle="Christmas Campaign" />
    );

    const titleField = screen.getByLabelText(/title/i);
    expect(titleField).toHaveValue('Christmas Campaign');
  });

  it('disables submit button when title is empty', () => {
    render(<ProjectForm onSubmit={jest.fn()} />);

    const submitButton = screen.getByRole('button', {
      name: /create project/i,
    });
    expect(submitButton).toBeDisabled();
  });

  it('shows required indicator on title field', () => {
    render(<ProjectForm onSubmit={jest.fn()} />);

    const titleField = screen.getByLabelText(/title/i);
    expect(titleField).toBeRequired();
  });

  it('Submit button is fullWidth and primary color', async () => {
    const mockOnSubmit = jest.fn();
    const user = userEvent.setup();

    render(<ProjectForm onSubmit={mockOnSubmit} />);

    // Need to add title to enable button
    await user.type(screen.getByLabelText(/title/i), 'Test Project');

    const submitButton = screen.getByRole('button', {
      name: /create project/i,
    });
    expect(submitButton).toHaveClass('MuiButton-fullWidth');
    expect(submitButton).toHaveClass('MuiButton-colorPrimary');
  });

  it('renders Cancel button when in edit mode (project prop provided)', () => {
    const mockOnSubmit = jest.fn();
    const mockOnCancel = jest.fn();
    const project = {
      id: 1,
      title: 'Existing Project',
      description: 'Test description',
      project_type: 'general' as const,
      system: false,
      donations_count: 0,
      sponsorships_count: 0,
      can_be_deleted: true,
    };

    render(
      <ProjectForm onSubmit={mockOnSubmit} project={project} onCancel={mockOnCancel} />
    );

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('does NOT render Cancel button when in create mode (no project prop)', () => {
    const mockOnSubmit = jest.fn();

    render(<ProjectForm onSubmit={mockOnSubmit} />);

    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });

  it('clears form fields when project prop changes from value to undefined', () => {
    const project = {
      id: 1,
      title: 'Test Project',
      description: 'Test Description',
      project_type: 'campaign' as const,
      system: false,
      donations_count: 0,
      sponsorships_count: 0,
      can_be_deleted: true,
    };

    const { rerender } = render(<ProjectForm onSubmit={jest.fn()} project={project} />);

    // Verify fields are populated with project data
    expect(screen.getByLabelText(/title/i)).toHaveValue('Test Project');
    expect(screen.getByLabelText(/description/i)).toHaveValue('Test Description');

    // Re-render without project (simulating Cancel click)
    rerender(<ProjectForm onSubmit={jest.fn()} project={undefined} />);

    // Verify fields are cleared
    expect(screen.getByLabelText(/title/i)).toHaveValue('');
    expect(screen.getByLabelText(/description/i)).toHaveValue('');
  });
});
