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

  it('shows validation error when name is empty', async () => {
    const mockSubmit = jest.fn();
    const user = userEvent.setup();

    render(<ChildForm onSubmit={mockSubmit} />);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
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
