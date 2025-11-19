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
    render(<ProjectForm onSubmit={jest.fn()} initialTitle="Christmas Campaign" />);

    const titleField = screen.getByLabelText(/title/i);
    expect(titleField).toHaveValue('Christmas Campaign');
  });
});
