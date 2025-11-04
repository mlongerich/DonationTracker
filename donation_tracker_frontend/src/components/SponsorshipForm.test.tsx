import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SponsorshipForm from './SponsorshipForm';

// Mock apiClient to avoid axios ESM issues
jest.mock('../api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('SponsorshipForm', () => {
  it('renders donor autocomplete field', () => {
    const mockSubmit = jest.fn();
    const mockCancel = jest.fn();

    render(
      <SponsorshipForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
        childId={1}
      />
    );

    expect(screen.getByLabelText(/donor/i)).toBeInTheDocument();
  });

  it('renders monthly amount field', () => {
    const mockSubmit = jest.fn();
    const mockCancel = jest.fn();

    render(
      <SponsorshipForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
        childId={1}
      />
    );

    expect(screen.getByLabelText(/monthly amount/i)).toBeInTheDocument();
  });

  it('calls onCancel when cancel clicked', async () => {
    const mockSubmit = jest.fn();
    const mockCancel = jest.fn();
    const user = userEvent.setup();

    render(
      <SponsorshipForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
        childId={1}
      />
    );

    const cancelButton = screen.getByText(/cancel/i);
    await user.click(cancelButton);

    expect(mockCancel).toHaveBeenCalled();
  });

  it('does not call onSubmit when donor not selected', async () => {
    const mockSubmit = jest.fn();
    const mockCancel = jest.fn();
    const user = userEvent.setup();

    render(
      <SponsorshipForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
        childId={1}
      />
    );

    // Type monthly amount only (no donor selected)
    const amountField = screen.getByLabelText(/monthly amount/i);
    await user.clear(amountField);
    await user.type(amountField, '50');

    // Click submit
    const submitButton = screen.getByText(/submit/i);
    await user.click(submitButton);

    // Should NOT call onSubmit without donor
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('defaults monthly amount to 100', () => {
    const mockSubmit = jest.fn();
    const mockCancel = jest.fn();

    render(
      <SponsorshipForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
        childId={1}
      />
    );

    const amountField = screen.getByLabelText(
      /monthly amount/i
    ) as HTMLInputElement;
    expect(amountField.value).toBe('100');
  });

  it('does not call onSubmit when amount is 0', async () => {
    const mockSubmit = jest.fn();
    const mockCancel = jest.fn();
    const user = userEvent.setup();

    render(
      <SponsorshipForm
        onSubmit={mockSubmit}
        onCancel={mockCancel}
        childId={1}
      />
    );

    // Explicitly set amount to 0
    const amountField = screen.getByLabelText(/monthly amount/i);
    await user.clear(amountField);
    await user.type(amountField, '0');

    // Click submit
    const submitButton = screen.getByText(/submit/i);
    await user.click(submitButton);

    // Should NOT call onSubmit with amount = 0
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('renders child autocomplete when childId not provided', () => {
    const mockSubmit = jest.fn();
    const mockCancel = jest.fn();

    render(<SponsorshipForm onSubmit={mockSubmit} onCancel={mockCancel} />);

    expect(screen.getByLabelText(/child/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/donor/i)).toBeInTheDocument();
  });

  it('does not call onSubmit when child not selected and childId not provided', async () => {
    const mockSubmit = jest.fn();
    const mockCancel = jest.fn();
    const user = userEvent.setup();

    render(<SponsorshipForm onSubmit={mockSubmit} onCancel={mockCancel} />);

    // Type monthly amount only (no child or donor selected)
    const amountField = screen.getByLabelText(/monthly amount/i);
    await user.clear(amountField);
    await user.type(amountField, '50');

    // Click submit
    const submitButton = screen.getByText(/submit/i);
    await user.click(submitButton);

    // Should NOT call onSubmit without child selection
    expect(mockSubmit).not.toHaveBeenCalled();
  });
});
