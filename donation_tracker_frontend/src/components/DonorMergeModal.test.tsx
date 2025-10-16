import React from 'react';
import { render, screen } from '@testing-library/react';
import DonorMergeModal from './DonorMergeModal';

describe('DonorMergeModal', () => {
  const mockDonors = [
    { id: 1, name: 'Alice Smith', email: 'alice@example.com' },
    { id: 2, name: 'Alice S.', email: 'alice.smith@example.com' },
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

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Alice S.')).toBeInTheDocument();
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

    const nameRadios = screen.getAllByRole('radio', { name: /name/i });
    expect(nameRadios).toHaveLength(2);
  });
});
