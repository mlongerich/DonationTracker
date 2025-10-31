import { render, screen } from '@testing-library/react';
import DonorMergeModal from './DonorMergeModal';

describe('DonorMergeModal', () => {
  const mockDonors = [
    { id: 1, name: 'Alice Smith', email: 'alice@example.com', displayable_email: 'alice@example.com' },
    { id: 2, name: 'Alice S.', email: 'alice.smith@example.com', displayable_email: 'alice.smith@example.com' },
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
});
