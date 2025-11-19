import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChildForm from './ChildForm';

describe('ChildForm', () => {
  it('renders name input field', () => {
    render(<ChildForm onSubmit={jest.fn()} />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it('submits form with entered name', async () => {
    const mockSubmit = jest.fn();
    const user = userEvent.setup();

    render(<ChildForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText(/name/i), 'Maria');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(mockSubmit).toHaveBeenCalledWith({ name: 'Maria', gender: null });
  });

  it('populates form with initial data when provided', () => {
    const initialData = { name: 'Maria' };

    render(<ChildForm onSubmit={jest.fn()} initialData={initialData} />);

    expect(screen.getByLabelText(/name/i)).toHaveValue('Maria');
  });

  it('disables submit button when name is empty', () => {
    render(<ChildForm onSubmit={jest.fn()} />);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when name is provided', async () => {
    const user = userEvent.setup();
    render(<ChildForm onSubmit={jest.fn()} />);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByLabelText(/name/i), 'Maria');
    expect(submitButton).toBeEnabled();
  });

  it('renders optional gender dropdown field', () => {
    render(<ChildForm onSubmit={jest.fn()} />);

    expect(screen.getByLabelText(/gender/i)).toBeInTheDocument();
  });

  it('submits form with selected gender', async () => {
    const mockSubmit = jest.fn();
    const user = userEvent.setup();

    render(<ChildForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText(/name/i), 'Maria');
    await user.click(screen.getByLabelText(/gender/i));
    await user.click(screen.getByText('Girl'));
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(mockSubmit).toHaveBeenCalledWith({ name: 'Maria', gender: 'girl' });
  });

  it('submits null for gender when "Not specified" is selected', async () => {
    const mockSubmit = jest.fn();
    const user = userEvent.setup();

    render(<ChildForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText(/name/i), 'Sam');
    await user.click(screen.getByLabelText(/gender/i));
    await user.click(screen.getByText(/not specified/i));
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(mockSubmit).toHaveBeenCalledWith({ name: 'Sam', gender: null });
  });
});
