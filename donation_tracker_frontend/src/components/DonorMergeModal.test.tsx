import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DonorMergeModal from './DonorMergeModal';

describe('DonorMergeModal', () => {
  const mockDonors = [
    {
      id: 1,
      name: 'Alice Smith',
      email: 'alice@example.com',
      displayable_email: 'alice@example.com',
      phone: '5551234567',
      full_address: '123 Main St\nSpringfield, IL 62701',
      address_line1: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zip_code: '62701',
      country: 'US',
    },
    {
      id: 2,
      name: 'Alice S.',
      email: 'alice.smith@example.com',
      displayable_email: 'alice.smith@example.com',
      phone: null,
      full_address: null,
      address_line1: null,
      city: null,
      state: null,
      zip_code: null,
      country: null,
    },
  ];

  it('displays donor names side by side', () => {
    render(
      <DonorMergeModal
        open={true}
        donors={mockDonors}
        onClose={() => {}}
        onConfirm={() => {}}
      />
    );

    // Use getAllByText since names appear multiple times (display + radio labels)
    const aliceSmithElements = screen.getAllByText('Alice Smith');
    expect(aliceSmithElements.length).toBeGreaterThan(0);

    const aliceSElements = screen.getAllByText('Alice S.');
    expect(aliceSElements.length).toBeGreaterThan(0);
  });

  it('displays radio buttons for name field selection', () => {
    render(
      <DonorMergeModal
        open={true}
        donors={mockDonors}
        onClose={() => {}}
        onConfirm={() => {}}
      />
    );

    // Find radios by their labels (the donor names)
    expect(screen.getByLabelText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByLabelText('Alice S.')).toBeInTheDocument();
  });

  it('displays radio buttons for phone field selection', () => {
    render(
      <DonorMergeModal
        open={true}
        donors={mockDonors}
        onClose={() => {}}
        onConfirm={() => {}}
      />
    );

    // Phone radio buttons should show phone number or "No phone"
    expect(screen.getByLabelText('5551234567')).toBeInTheDocument();
    expect(screen.getByLabelText('No phone')).toBeInTheDocument();
  });

  it('displays radio buttons for address field selection', () => {
    render(
      <DonorMergeModal
        open={true}
        donors={mockDonors}
        onClose={() => {}}
        onConfirm={() => {}}
      />
    );

    // Address radio buttons should show full address or "No address"
    // Using partial match since the full address contains newlines
    const addressElements = screen.getAllByText(/123 Main St/);
    expect(addressElements.length).toBeGreaterThan(0);
    expect(screen.getByLabelText('No address')).toBeInTheDocument();
  });

  it('calls onConfirm with all field selections when Confirm Merge is clicked', async () => {
    const user = userEvent.setup();
    const mockOnConfirm = jest.fn();

    render(
      <DonorMergeModal
        open={true}
        donors={mockDonors}
        onClose={() => {}}
        onConfirm={mockOnConfirm}
      />
    );

    // Click Confirm Merge button
    const confirmButton = screen.getByRole('button', { name: /confirm merge/i });
    await user.click(confirmButton);

    // Should be called with all four field selections (defaults to first donor)
    expect(mockOnConfirm).toHaveBeenCalledWith({
      name: 1,
      email: 1,
      phone: 1,
      address: 1,
    });
  });

  it('initializes with first donor ID even when donors prop changes after mount', async () => {
    const user = userEvent.setup();
    const mockOnConfirm = jest.fn();
    const { rerender } = render(
      <DonorMergeModal
        open={true}
        donors={[]}
        onClose={() => {}}
        onConfirm={mockOnConfirm}
      />
    );

    // Simulate donors loading after component mounted (real-world scenario)
    rerender(
      <DonorMergeModal
        open={true}
        donors={mockDonors}
        onClose={() => {}}
        onConfirm={mockOnConfirm}
      />
    );

    // Click Confirm Merge button
    const confirmButton = screen.getByRole('button', { name: /confirm merge/i });
    await user.click(confirmButton);

    // Should use first donor's ID (1), NOT 0
    expect(mockOnConfirm).toHaveBeenCalledWith({
      name: 1,
      email: 1,
      phone: 1,
      address: 1,
    });
  });
});
