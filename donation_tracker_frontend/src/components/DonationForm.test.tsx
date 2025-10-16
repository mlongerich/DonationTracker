import { render, screen } from '@testing-library/react';
import DonationForm from './DonationForm';

jest.mock('../api/client');

const mockDonors = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
];

describe('DonationForm', () => {
  it('renders donation form fields', () => {
    render(<DonationForm donors={mockDonors} />);

    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
  });

  it('renders date field', () => {
    render(<DonationForm donors={mockDonors} />);

    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
  });

  it('renders donor field', () => {
    render(<DonationForm donors={mockDonors} />);

    expect(screen.getByLabelText(/donor/i)).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<DonationForm donors={mockDonors} />);

    expect(screen.getByRole('button', { name: /create donation/i })).toBeInTheDocument();
  });

  it('renders donor dropdown instead of donor ID input', () => {
    render(<DonationForm donors={mockDonors} />);

    const donorField = screen.getByLabelText(/donor/i);
    expect(donorField.tagName).toBe('SELECT');
  });
});
