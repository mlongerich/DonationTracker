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

  it('renders form fields with Stack spacing', () => {
    const { container } = render(<ProjectForm onSubmit={jest.fn()} />);

    // Check for MUI Stack component with spacing
    const stack = container.querySelector('.MuiStack-root');
    expect(stack).toBeInTheDocument();
  });
});
