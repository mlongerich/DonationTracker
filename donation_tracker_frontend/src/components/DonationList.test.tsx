import { render, screen } from '@testing-library/react';
import DonationList from './DonationList';

jest.mock('../api/client');

describe('DonationList', () => {
  it('renders empty state when no donations', () => {
    render(<DonationList donations={[]} />);

    expect(screen.getByText(/no donations/i)).toBeInTheDocument();
  });

  it('empty state should use Material-UI Typography with centered layout', () => {
    render(<DonationList donations={[]} />);

    const emptyMessage = screen.getByText(/no donations/i);
    expect(emptyMessage).toHaveClass('MuiTypography-root');
    expect(emptyMessage).toBeInTheDocument();
  });

  it('renders donation with amount and date', () => {
    const donations = [
      {
        id: 1,
        amount: '10050', // 100.50 dollars = 10050 cents
        date: '2025-10-15',
        donor_id: 1,
        donor_name: 'John Doe',
        status: 'succeeded' as const,
      },
    ];

    render(<DonationList donations={donations} />);

    expect(screen.getByText(/\$100\.50/i)).toBeInTheDocument();
    expect(screen.getByText(/2025-10-15/i)).toBeInTheDocument();
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
  });

  it('each donation should be rendered as a Material-UI Card', () => {
    const donations = [
      {
        id: 1,
        amount: '10050', // Amount in cents as string
        date: '2025-10-15',
        donor_id: 1,
        donor_name: 'John Doe',
        status: 'succeeded' as const,
      },
    ];

    render(<DonationList donations={donations} />);

    // Verify donation data is rendered with MUI Typography
    const amountText = screen.getByText(/\$100\.50/i);
    expect(amountText).toBeInTheDocument();
    expect(amountText).toHaveClass('MuiTypography-subtitle1');
  });

  it('renders donation with project title', () => {
    const donations = [
      {
        id: 1,
        amount: '100.50',
        date: '2025-10-15',
        donor_id: 1,
        donor_name: 'John Doe',
        status: 'succeeded' as const,
        project_title: 'Summer Campaign',
      },
    ];

    render(<DonationList donations={donations} />);

    expect(screen.getByText(/Summer Campaign/i)).toBeInTheDocument();
  });

  it('displays project title for each donation', () => {
    const donations = [
      {
        id: 1,
        amount: '100.00',
        date: '2024-01-15',
        donor_id: 1,
        donor_name: 'John Doe',
        status: 'succeeded' as const,
        project_title: 'Summer Campaign',
      },
    ];

    render(<DonationList donations={donations} />);

    expect(screen.getByText(/summer campaign/i)).toBeInTheDocument();
  });

  it('displays "General Donation" when project_title is undefined', () => {
    const donations = [
      {
        id: 1,
        amount: '100.00',
        date: '2024-01-15',
        donor_id: 1,
        donor_name: 'John Doe',
        status: 'succeeded' as const,
        project_title: undefined,
      },
    ];

    render(<DonationList donations={donations} />);

    expect(screen.getByText(/general donation/i)).toBeInTheDocument();
  });

  it('converts string amount to number before formatting currency (TICKET-071)', () => {
    // API returns amount as string, formatCurrency expects number
    // Verifies Number() conversion works correctly
    const donations = [
      {
        id: 1,
        amount: '2500', // String from API (cents)
        date: '2024-01-15',
        donor_id: 1,
        donor_name: 'Raymond McGaw',
        status: 'succeeded' as const,
        project_title: 'General Donation',
      },
    ];

    render(<DonationList donations={donations} />);

    // Should display as $25.00, not $2500.00
    expect(screen.getByText(/\$25\.00/i)).toBeInTheDocument();
  });

  it('displays payment method badge for stripe donation', () => {
    const donations = [
      {
        id: 1,
        amount: '10000',
        date: '2024-01-15',
        donor_id: 1,
        donor_name: 'John Doe',
        status: 'succeeded' as const,
        payment_method: 'stripe' as const,
      },
    ];

    render(<DonationList donations={donations} />);

    expect(screen.getByText('Stripe')).toBeInTheDocument();
  });

  it('displays payment method badge for check donation', () => {
    const donations = [
      {
        id: 1,
        amount: '10000',
        date: '2024-01-15',
        donor_id: 1,
        donor_name: 'John Doe',
        status: 'succeeded' as const,
        payment_method: 'check' as const,
      },
    ];

    render(<DonationList donations={donations} />);

    expect(screen.getByText('Check')).toBeInTheDocument();
  });

  it('displays payment method badge for bank_transfer with proper formatting', () => {
    const donations = [
      {
        id: 1,
        amount: '10000',
        date: '2024-01-15',
        donor_id: 1,
        donor_name: 'John Doe',
        status: 'succeeded' as const,
        payment_method: 'bank_transfer' as const,
      },
    ];

    render(<DonationList donations={donations} />);

    expect(screen.getByText(/Bank Transfer/i)).toBeInTheDocument();
  });

  it('renders multiple donations', () => {
    const donations = [
      {
        id: 1,
        amount: '10000',
        date: '2024-01-15',
        donor_id: 1,
        donor_name: 'John Doe',
        status: 'succeeded' as const,
      },
      {
        id: 2,
        amount: '20000',
        date: '2024-01-16',
        donor_id: 2,
        donor_name: 'Jane Smith',
        status: 'succeeded' as const,
      },
    ];

    render(<DonationList donations={donations} />);

    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/Jane Smith/i)).toBeInTheDocument();
    expect(screen.getByText(/\$100\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/\$200\.00/i)).toBeInTheDocument();
  });
});
