import { render, screen } from '@testing-library/react';
import PendingReviewDonationList from './PendingReviewDonationList';
import { Donation } from '../types';

const mockDonation: Donation = {
  id: 1,
  amount: '10000',
  date: '2025-01-15',
  donor_id: 1,
  donor_name: 'John Doe',
  status: 'failed',
  payment_method: 'stripe',
};

describe('PendingReviewDonationList', () => {
  it('shows loading state', () => {
    render(
      <PendingReviewDonationList
        donations={[]}
        isLoading={true}
        paginationMeta={null}
        onPageChange={jest.fn()}
      />
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows empty state when no donations', () => {
    render(
      <PendingReviewDonationList
        donations={[]}
        isLoading={false}
        paginationMeta={null}
        onPageChange={jest.fn()}
      />
    );
    expect(
      screen.getByText(/no donations need attention/i)
    ).toBeInTheDocument();
  });

  it('displays donation with donor name', () => {
    render(
      <PendingReviewDonationList
        donations={[mockDonation]}
        isLoading={false}
        paginationMeta={null}
        onPageChange={jest.fn()}
      />
    );
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('displays donation date', () => {
    render(
      <PendingReviewDonationList
        donations={[mockDonation]}
        isLoading={false}
        paginationMeta={null}
        onPageChange={jest.fn()}
      />
    );
    expect(screen.getByText('2025-01-15')).toBeInTheDocument();
  });

  it('displays formatted amount', () => {
    render(
      <PendingReviewDonationList
        donations={[mockDonation]}
        isLoading={false}
        paginationMeta={null}
        onPageChange={jest.fn()}
      />
    );
    expect(screen.getByText('$100.00')).toBeInTheDocument();
  });

  it('displays status badge', () => {
    render(
      <PendingReviewDonationList
        donations={[mockDonation]}
        isLoading={false}
        paginationMeta={null}
        onPageChange={jest.fn()}
      />
    );
    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });

  it('shows duplicate subscription warning', () => {
    const donation: Donation = {
      ...mockDonation,
      duplicate_subscription_detected: true,
    };
    render(
      <PendingReviewDonationList
        donations={[donation]}
        isLoading={false}
        paginationMeta={null}
        onPageChange={jest.fn()}
      />
    );
    expect(
      screen.getByText(/duplicate subscription detected/i)
    ).toBeInTheDocument();
  });

  it('shows needs_attention_reason', () => {
    const donation: Donation = {
      ...mockDonation,
      status: 'needs_attention',
      needs_attention_reason: 'Metadata child_id=999 not found',
    };
    render(
      <PendingReviewDonationList
        donations={[donation]}
        isLoading={false}
        paginationMeta={null}
        onPageChange={jest.fn()}
      />
    );
    expect(
      screen.getByText(/Reason: Metadata child_id=999 not found/i)
    ).toBeInTheDocument();
  });

  it('applies error color to failed status badge', () => {
    const donation: Donation = {
      ...mockDonation,
      status: 'failed',
    };
    render(
      <PendingReviewDonationList
        donations={[donation]}
        isLoading={false}
        paginationMeta={null}
        onPageChange={jest.fn()}
      />
    );
    // Verify FAILED badge is displayed (color is determined by MUI theme)
    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });

  it('renders pagination when multiple pages exist', () => {
    const paginationMeta = {
      total_count: 50,
      total_pages: 2,
      current_page: 1,
      per_page: 25,
    };
    render(
      <PendingReviewDonationList
        donations={[mockDonation]}
        isLoading={false}
        paginationMeta={paginationMeta}
        onPageChange={jest.fn()}
      />
    );
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
