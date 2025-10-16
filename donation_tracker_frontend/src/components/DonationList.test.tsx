import { render, screen } from '@testing-library/react';
import DonationList from './DonationList';

jest.mock('../api/client');

describe('DonationList', () => {
  it('renders empty state when no donations', () => {
    render(<DonationList donations={[]} />);

    expect(screen.getByText(/no donations/i)).toBeInTheDocument();
  });

  it('renders donation with amount and date', () => {
    const donations = [
      {
        id: 1,
        amount: '100.50',
        date: '2025-10-15',
        donor_id: 1,
        donor_name: 'John Doe',
      },
    ];

    render(<DonationList donations={donations} />);

    expect(screen.getByText(/\$100.50/i)).toBeInTheDocument();
    expect(screen.getByText(/2025-10-15/i)).toBeInTheDocument();
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
  });

  it('renders pagination controls when metadata provided', () => {
    const donations = [
      {
        id: 1,
        amount: '100.50',
        date: '2025-10-15',
        donor_id: 1,
        donor_name: 'John Doe',
      },
    ];
    const paginationMeta = {
      total_count: 50,
      total_pages: 2,
      current_page: 1,
      per_page: 25,
    };

    render(<DonationList donations={donations} paginationMeta={paginationMeta} />);

    // Should show pagination when total_pages > 1
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('does not render pagination when only one page', () => {
    const donations = [
      {
        id: 1,
        amount: '100.50',
        date: '2025-10-15',
        donor_id: 1,
        donor_name: 'John Doe',
      },
    ];
    const paginationMeta = {
      total_count: 5,
      total_pages: 1,
      current_page: 1,
      per_page: 25,
    };

    render(<DonationList donations={donations} paginationMeta={paginationMeta} />);

    // Should NOT show pagination when total_pages === 1
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
