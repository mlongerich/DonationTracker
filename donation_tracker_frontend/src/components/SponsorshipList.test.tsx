import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SponsorshipList from './SponsorshipList';
import { Sponsorship } from '../types';

describe('SponsorshipList', () => {
  const mockSponsorships: Sponsorship[] = [
    {
      id: 1,
      donor_id: 1,
      donor_name: 'John Doe',
      child_id: 1,
      child_name: 'Maria',
      project_id: 1,
      project_title: 'Sponsor Maria',
      monthly_amount: '5000', // 50 dollars = 5000 cents
      start_date: '2025-01-01',
      active: true
    }
  ];

  it('renders table with sponsorship data', () => {
    render(<SponsorshipList sponsorships={mockSponsorships} onEndSponsorship={jest.fn()} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Maria')).toBeInTheDocument();
    expect(screen.getByText(/\$50/)).toBeInTheDocument();
  });

  it('calls onEndSponsorship when End button is clicked', async () => {
    const mockEndSponsorship = jest.fn();
    const user = userEvent.setup();

    render(<SponsorshipList sponsorships={mockSponsorships} onEndSponsorship={mockEndSponsorship} />);

    const endButton = screen.getByRole('button', { name: /end/i });
    await user.click(endButton);

    expect(mockEndSponsorship).toHaveBeenCalledWith(1);
  });

  it('shows empty state when no sponsorships', () => {
    render(<SponsorshipList sponsorships={[]} onEndSponsorship={jest.fn()} />);

    expect(screen.getByText(/no sponsorships found/i)).toBeInTheDocument();
  });

  it('does not show End button for ended sponsorships', () => {
    const endedSponsorship: Sponsorship[] = [{
      id: 2,
      donor_id: 2,
      donor_name: 'Jane Smith',
      child_id: 2,
      child_name: 'Juan',
      project_id: 2,
      project_title: 'Sponsor Juan',
      monthly_amount: '3000', // 30 dollars = 3000 cents
      start_date: '2025-01-01',
      end_date: '2025-01-15',
      active: false
    }];

    render(<SponsorshipList sponsorships={endedSponsorship} onEndSponsorship={jest.fn()} />);

    expect(screen.queryByRole('button', { name: /end/i })).not.toBeInTheDocument();
    expect(screen.getByText('Ended')).toBeInTheDocument();
  });
});
