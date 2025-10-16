import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DonationForm from './DonationForm';
import apiClient from '../api/client';

jest.mock('../api/client');

describe('DonationForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders donation form fields', () => {
    render(<DonationForm />);

    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
  });

  it('renders date field', () => {
    render(<DonationForm />);

    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
  });

  it('renders donor field', () => {
    render(<DonationForm />);

    expect(screen.getByLabelText(/donor/i)).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<DonationForm />);

    expect(screen.getByRole('button', { name: /create donation/i })).toBeInTheDocument();
  });

  it('renders autocomplete for donor search instead of dropdown', () => {
    render(<DonationForm />);

    const autocomplete = screen.getByLabelText(/donor/i);
    expect(autocomplete).toBeInTheDocument();
    expect(autocomplete.tagName).toBe('INPUT'); // Autocomplete uses input, not select
  });

  it('searches for donors when user types in autocomplete', async () => {
    const mockDonors = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
    ];

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { donors: mockDonors },
    });

    const user = userEvent.setup();
    render(<DonationForm />);

    const autocomplete = screen.getByLabelText(/donor/i);
    await user.type(autocomplete, 'John');

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/donors', {
        params: {
          q: { name_or_email_cont: 'John' },
          per_page: 10,
        },
      });
    });
  });

  it('hides mailinator emails in autocomplete options', async () => {
    const mockDonors = [
      { id: 1, name: 'John Doe', email: 'john@mailinator.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    ];

    // Mock the get method to return donors
    (apiClient.get as jest.Mock).mockImplementation((url) => {
      if (url === '/api/donors') {
        return Promise.resolve({ data: { donors: mockDonors } });
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    const user = userEvent.setup();
    render(<DonationForm />);

    const autocomplete = screen.getByLabelText(/donor/i);

    // Type slowly to ensure debounce completes
    await user.type(autocomplete, 'J');

    // Wait for debounce and API call
    await waitFor(
      () => {
        expect(apiClient.get).toHaveBeenCalledWith('/api/donors', expect.objectContaining({
          params: expect.objectContaining({
            q: { name_or_email_cont: 'J' },
            per_page: 10,
          }),
        }));
      },
      { timeout: 5000 }
    );

    // Wait for the listbox to appear
    await waitFor(
      () => {
        const listbox = screen.queryByRole('listbox');
        expect(listbox).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Check that options are rendered with correct email hiding
    await waitFor(
      () => {
        // Use getAllByRole to find options
        const options = screen.getAllByRole('option');
        expect(options.length).toBeGreaterThan(0);

        // Check the text content includes our expected values
        const allText = options.map(opt => opt.textContent).join(' ');
        expect(allText).toContain('John Doe (No email provided)');
        expect(allText).toContain('Jane Smith (jane@example.com)');
      },
      { timeout: 5000 }
    );
  });
});
