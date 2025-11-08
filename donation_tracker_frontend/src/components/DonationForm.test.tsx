import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DonationForm from './DonationForm';
import apiClient, { searchProjectOrChild, createDonation } from '../api/client';

jest.mock('../api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
  searchProjectOrChild: jest.fn(),
  createDonation: jest.fn(),
}));

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

    expect(
      screen.getByRole('button', { name: /create donation/i })
    ).toBeInTheDocument();
  });

  it('renders autocomplete for donor search instead of dropdown', () => {
    render(<DonationForm />);

    const autocomplete = screen.getByLabelText(/donor/i);
    expect(autocomplete).toBeInTheDocument();
    expect(autocomplete.tagName).toBe('INPUT'); // Autocomplete uses input, not select
  });

  it('searches for donors when user types in autocomplete', async () => {
    const mockDonors = [{ id: 1, name: 'John Doe', email: 'john@example.com' }];

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
      {
        id: 1,
        name: 'John Doe',
        email: 'john@mailinator.com',
        displayable_email: null,
      }, // mailinator hidden
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        displayable_email: 'jane@example.com',
      },
    ];

    // Mock the get method to return donors
    (apiClient.get as jest.Mock).mockImplementation((url) => {
      if (url === '/api/donors') {
        return Promise.resolve({ data: { donors: mockDonors } });
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    // Mock searchProjectOrChild to prevent errors from ProjectOrChildAutocomplete
    (searchProjectOrChild as jest.Mock).mockResolvedValue({
      projects: [],
      children: [],
    });

    const user = userEvent.setup();
    render(<DonationForm />);

    const autocomplete = screen.getByLabelText(/donor/i);

    // Type slowly to ensure debounce completes
    await user.type(autocomplete, 'J');

    // Wait for debounce and API call
    await waitFor(
      () => {
        expect(apiClient.get).toHaveBeenCalledWith(
          '/api/donors',
          expect.objectContaining({
            params: expect.objectContaining({
              q: { name_or_email_cont: 'J' },
              per_page: 10,
            }),
          })
        );
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
        const options = screen.getAllByRole('option');
        expect(options.length).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );

    // Check the text content includes our expected values
    const options = screen.getAllByRole('option');
    const allText = options.map((opt) => opt.textContent).join(' ');
    expect(allText).toContain('John Doe (No email provided)');
    expect(allText).toContain('Jane Smith (jane@example.com)');
  });

  it('renders project or child autocomplete field', () => {
    render(<DonationForm />);

    expect(screen.getByLabelText(/donation for/i)).toBeInTheDocument();
  });

  it('defaults to General Donation on load', () => {
    render(<DonationForm />);

    const field = screen.getByLabelText(/donation for/i);
    expect(field).toHaveValue('General Donation');
  });

  it('amount field should be a Material-UI TextField', () => {
    render(<DonationForm />);

    const amountField = screen.getByLabelText(/amount/i);
    // Material-UI TextField has specific class names
    expect(amountField).toHaveClass('MuiInputBase-input');
  });

  it('date field should be a Material-UI TextField', () => {
    render(<DonationForm />);

    const dateField = screen.getByLabelText(/date/i);
    expect(dateField).toHaveClass('MuiInputBase-input');
  });

  it('project or child field should be a Material-UI Autocomplete', () => {
    render(<DonationForm />);

    const projectOrChildField = screen.getByLabelText(/donation for/i);
    expect(projectOrChildField).toHaveClass('MuiInputBase-input');
  });

  it('submit button should be a Material-UI Button', () => {
    render(<DonationForm />);

    const submitButton = screen.getByRole('button', {
      name: /create donation/i,
    });
    expect(submitButton).toHaveClass('MuiButton-root');
  });

  it('success message should be a Material-UI Alert', async () => {
    (createDonation as jest.Mock).mockResolvedValue({});
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        donors: [{ id: 1, name: 'Test Donor', email: 'test@example.com' }],
      },
    });

    const user = userEvent.setup();
    render(<DonationForm />);

    // Fill out form
    await user.type(screen.getByLabelText(/amount/i), '100');

    // Select donor from autocomplete
    const donorField = screen.getByLabelText(/donor/i);
    await user.type(donorField, 'Test');
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const option = await screen.findByRole('option');
    await user.click(option);

    // Submit form
    await user.click(screen.getByRole('button', { name: /create donation/i }));

    // Check for Material-UI Alert
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('MuiAlert-root');
    });
  });

  it('passes child_id to backend when child selected', async () => {
    const mockDonor = { id: 1, name: 'John Doe', email: 'john@example.com' };

    // Mock API responses
    (searchProjectOrChild as jest.Mock).mockResolvedValue({
      projects: [],
      children: [{ id: 5, name: 'Eli' }],
    });
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { donors: [mockDonor] },
    });
    (createDonation as jest.Mock).mockResolvedValue({});

    const user = userEvent.setup();
    render(<DonationForm />);

    // Select child from project/child autocomplete
    const projectField = screen.getByLabelText(/donation for/i);
    await user.clear(projectField);
    await user.type(projectField, 'Eli');
    await waitFor(() =>
      expect(searchProjectOrChild).toHaveBeenCalledWith('Eli')
    );
    const childOption = await screen.findByText(/Eli/);
    await user.click(childOption);

    // Select donor
    const donorField = screen.getByLabelText(/donor/i);
    await user.type(donorField, 'John');
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const donorOption = await screen.findByText(/John Doe/);
    await user.click(donorOption);

    // Fill amount and submit
    await user.type(screen.getByLabelText(/amount/i), '100');
    await user.click(screen.getByRole('button', { name: /create donation/i }));

    // Verify donation includes child_id (backend handles sponsorship auto-creation)
    await waitFor(() => {
      expect(createDonation).toHaveBeenCalledWith(
        expect.objectContaining({
          child_id: 5,
          donor_id: 1,
          amount: 10000, // 100 dollars = 10000 cents
        })
      );
    });
  }, 10000); // Increase timeout for userEvent typing delays + debounced API calls

  it('shows info alert when child is selected', async () => {
    (searchProjectOrChild as jest.Mock).mockResolvedValue({
      projects: [],
      children: [{ id: 5, name: 'Maria' }],
    });

    const user = userEvent.setup();
    render(<DonationForm />);

    // Select child from autocomplete
    const projectField = screen.getByLabelText(/donation for/i);
    await user.clear(projectField);
    await user.type(projectField, 'Maria');
    await waitFor(() =>
      expect(searchProjectOrChild).toHaveBeenCalledWith('Maria')
    );
    const childOption = await screen.findByText(/Maria/);
    await user.click(childOption);

    // Check for info alert
    await waitFor(() => {
      const alert = screen.getByText(
        /this donation will create\/update a sponsorship for Maria/i
      );
      expect(alert).toBeInTheDocument();
    });
  });
});
