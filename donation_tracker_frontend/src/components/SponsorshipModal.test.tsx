import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SponsorshipModal from './SponsorshipModal';
import apiClient from '../api/client';

// Mock API client
jest.mock('../api/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Mock the DonorAutocomplete component since it's used by SponsorshipForm
jest.mock('./DonorAutocomplete', () => ({
  __esModule: true,
  default: ({ onChange, label }: { onChange: (donor: unknown) => void; label: string }) => (
    <input
      aria-label={label}
      onChange={(e) => onChange(e.target.value ? { id: 1, name: 'Test Donor', email: 'test@example.com' } : null)}
    />
  ),
}));

describe('SponsorshipModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog when open is true', () => {
    render(
      <SponsorshipModal
        open={true}
        childId={1}
        childName="Maria"
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );

    expect(screen.getByText(/add sponsor for maria/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/donor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/monthly amount/i)).toBeInTheDocument();
  });

  it('does not render dialog when open is false', () => {
    render(
      <SponsorshipModal
        open={false}
        childId={1}
        childName="Maria"
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );

    expect(screen.queryByText(/add sponsor for maria/i)).not.toBeInTheDocument();
  });

  it('calls onClose when cancel button clicked', async () => {
    const mockOnClose = jest.fn();
    const user = userEvent.setup();

    render(
      <SponsorshipModal
        open={true}
        childId={1}
        childName="Maria"
        onClose={mockOnClose}
        onSuccess={jest.fn()}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls API and onSuccess when form submitted with valid data', async () => {
    const mockOnSuccess = jest.fn();
    const user = userEvent.setup();

    mockedApiClient.post.mockResolvedValue({ data: { sponsorship: { id: 1 } } });

    render(
      <SponsorshipModal
        open={true}
        childId={1}
        childName="Maria"
        onClose={jest.fn()}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill in donor
    const donorInput = screen.getByLabelText(/donor/i);
    await user.type(donorInput, 'John');

    // Fill in amount (clear default value first)
    const amountInput = screen.getByLabelText(/monthly amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, '50');

    // Submit
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockedApiClient.post).toHaveBeenCalledWith('/api/sponsorships', {
        sponsorship: {
          donor_id: 1,
          child_id: 1,
          monthly_amount: 50,
        },
      });
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('closes modal after successful sponsorship submission', async () => {
    const mockOnClose = jest.fn();
    const mockOnSuccess = jest.fn();
    const user = userEvent.setup();

    mockedApiClient.post.mockResolvedValue({
      data: { sponsorship: { id: 1 } }
    });

    render(
      <SponsorshipModal
        open={true}
        childId={1}
        childName="Maria"
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill in donor
    const donorInput = screen.getByLabelText(/donor/i);
    await user.type(donorInput, 'John');

    // Fill in amount
    const amountInput = screen.getByLabelText(/monthly amount/i);
    await user.type(amountInput, '50');

    // Submit
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('displays error message when sponsorship creation fails with 422', async () => {
    const user = userEvent.setup();

    mockedApiClient.post.mockRejectedValue({
      response: {
        status: 422,
        data: { errors: ['Sponsorship already exists for this donor and child'] }
      }
    });

    render(
      <SponsorshipModal
        open={true}
        childId={1}
        childName="Maria"
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );

    // Fill in donor
    const donorInput = screen.getByLabelText(/donor/i);
    await user.type(donorInput, 'John');

    // Fill in amount
    const amountInput = screen.getByLabelText(/monthly amount/i);
    await user.type(amountInput, '50');

    // Submit
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Sponsorship already exists/i)).toBeInTheDocument();
    });
  });
});
