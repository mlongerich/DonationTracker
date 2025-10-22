import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChildForm from './ChildForm';

describe('ChildForm', () => {
  it('renders name input field', () => {
    render(<ChildForm onSubmit={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it('submits form with entered name', async () => {
    const mockSubmit = jest.fn();
    const user = userEvent.setup();

    render(<ChildForm onSubmit={mockSubmit} onCancel={jest.fn()} />);

    await user.type(screen.getByLabelText(/name/i), 'Maria');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(mockSubmit).toHaveBeenCalledWith({ name: 'Maria' });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const mockCancel = jest.fn();
    const user = userEvent.setup();

    render(<ChildForm onSubmit={jest.fn()} onCancel={mockCancel} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockCancel).toHaveBeenCalled();
  });

  it('populates form with initial data when provided', () => {
    const initialData = { name: 'Maria' };

    render(<ChildForm onSubmit={jest.fn()} onCancel={jest.fn()} initialData={initialData} />);

    expect(screen.getByLabelText(/name/i)).toHaveValue('Maria');
  });

  it('shows validation error when name is empty', async () => {
    const mockSubmit = jest.fn();
    const user = userEvent.setup();

    render(<ChildForm onSubmit={mockSubmit} onCancel={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });
});
