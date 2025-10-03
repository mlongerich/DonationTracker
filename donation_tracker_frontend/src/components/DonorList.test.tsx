import { render, screen } from '@testing-library/react';
import DonorList from './DonorList';

describe('DonorList', () => {
  it('renders empty state when no donors provided', () => {
    render(<DonorList donors={[]} />);
    expect(screen.getByText(/no donors yet/i)).toBeInTheDocument();
  });

  it('displays donor names and emails when donors provided', () => {
    const donors = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    ];

    render(<DonorList donors={donors} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('displays donors in the order provided', () => {
    const donors = [
      { id: 3, name: 'Newest Donor', email: 'newest@example.com' },
      { id: 2, name: 'Middle Donor', email: 'middle@example.com' },
      { id: 1, name: 'Oldest Donor', email: 'oldest@example.com' },
    ];

    render(<DonorList donors={donors} />);

    // Verify all donors are displayed
    expect(screen.getByText('Newest Donor')).toBeInTheDocument();
    expect(screen.getByText('Middle Donor')).toBeInTheDocument();
    expect(screen.getByText('Oldest Donor')).toBeInTheDocument();
  });
});
