import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DonationForm from './DonationForm';
import apiClient, { searchProjectOrChild, createDonation } from '../api/client';

jest.mock('../api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
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

    expect(
      screen.getByRole('combobox', { name: /donor/i })
    ).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<DonationForm />);

    expect(
      screen.getByRole('button', { name: /create donation/i })
    ).toBeInTheDocument();
  });

  it('renders autocomplete for donor search instead of dropdown', () => {
    render(<DonationForm />);

    const autocomplete = screen.getByRole('combobox', { name: /donor/i });
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

    const autocomplete = screen.getByRole('combobox', { name: /donor/i });
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

    const autocomplete = screen.getByRole('combobox', { name: /donor/i });

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
    const donorField = screen.getByRole('combobox', { name: /donor/i });
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
    const donorField = screen.getByRole('combobox', { name: /donor/i });
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

  it('renders payment method dropdown', () => {
    render(<DonationForm />);

    expect(screen.getByLabelText(/payment method/i)).toBeInTheDocument();
  });

  it('defaults payment method to check', () => {
    render(<DonationForm />);

    const paymentMethodField = screen.getByRole('combobox', {
      name: /payment method/i,
    });
    expect(paymentMethodField).toHaveTextContent('Check');
  });

  it('submits payment_method to API', async () => {
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
    const donorField = screen.getByRole('combobox', { name: /donor/i });
    await user.type(donorField, 'Test');
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const option = await screen.findByRole('option');
    await user.click(option);

    // Submit form
    await user.click(screen.getByRole('button', { name: /create donation/i }));

    // Check payment_method included in API call
    await waitFor(() => {
      expect(createDonation).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method: 'check',
        })
      );
    });
  });

  it('clicking create donor icon button opens QuickDonorCreateDialog', async () => {
    const user = userEvent.setup();
    render(<DonationForm />);

    // Find and click the create donor icon button
    const createDonorButton = screen.getByRole('button', {
      name: /create donor/i,
    });
    await user.click(createDonorButton);

    // Dialog should appear
    expect(screen.getByText('Create New Donor')).toBeInTheDocument();
  });

  it('created donor auto-selects in DonorAutocomplete', async () => {
    const user = userEvent.setup();
    const mockDonor = {
      id: 5,
      name: 'New Donor',
      email: 'new@example.com',
      displayable_email: 'new@example.com', // Backend provides this for real emails
      discarded_at: null,
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { donor: mockDonor },
    });

    render(<DonationForm />);

    // Open dialog
    const createDonorButton = screen.getByRole('button', {
      name: /create donor/i,
    });
    await user.click(createDonorButton);

    // Fill out and submit form
    await user.type(screen.getByLabelText(/name/i), 'New Donor');
    await user.type(screen.getByLabelText(/email/i), 'new@example.com');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // Verify donor is auto-selected in autocomplete
    // DonorAutocomplete displays "Name (displayable_email)" format
    await waitFor(() => {
      const donorField = screen.getByRole('combobox', { name: /donor/i });
      expect(donorField).toHaveValue('New Donor (new@example.com)');
    });
  });

  it('dialog can be canceled without losing donation form data', async () => {
    const user = userEvent.setup();
    render(<DonationForm />);

    // Fill out donation form with data
    await user.type(screen.getByLabelText(/amount/i), '150');

    // Open create donor dialog
    const createDonorButton = screen.getByRole('button', {
      name: /create donor/i,
    });
    await user.click(createDonorButton);

    // Verify dialog is open
    expect(screen.getByText('Create New Donor')).toBeInTheDocument();

    // Close dialog by pressing Escape
    await user.keyboard('{Escape}');

    // Verify dialog is closed
    await waitFor(() => {
      expect(screen.queryByText('Create New Donor')).not.toBeInTheDocument();
    });

    // Verify donation form data is preserved
    expect(screen.getByLabelText(/amount/i)).toHaveValue(150);
  });

  it('pre-fills name in dialog when typed text does not contain @', async () => {
    const user = userEvent.setup();
    render(<DonationForm />);

    // Type name in donor autocomplete
    const donorField = screen.getByRole('combobox', { name: /donor/i });
    await user.type(donorField, 'John Doe');

    // Open create donor dialog
    const createDonorButton = screen.getByRole('button', {
      name: /create donor/i,
    });
    await user.click(createDonorButton);

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByText('Create New Donor')).toBeInTheDocument();
    });

    // Verify name is pre-filled
    const nameFields = screen.getAllByLabelText(/name/i);
    const dialogNameField = nameFields.find(
      (field) => (field as HTMLInputElement).value === 'John Doe'
    );
    expect(dialogNameField).toHaveValue('John Doe');
  });

  it('clears search input when dialog closes', async () => {
    const user = userEvent.setup();
    const mockDonor = {
      id: 15,
      name: 'Created Donor',
      email: 'created@example.com',
      displayable_email: 'created@example.com',
      discarded_at: null,
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { donor: mockDonor },
    });

    render(<DonationForm />);

    // Type in donor autocomplete
    const donorField = screen.getByRole('combobox', { name: /donor/i });
    await user.type(donorField, 'Created Donor');

    // Open dialog and create donor
    await user.click(screen.getByRole('button', { name: /create donor/i }));
    await user.type(screen.getByLabelText(/email/i), 'created@example.com');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // Wait for dialog to close
    await waitFor(() => {
      expect(screen.queryByText('Create New Donor')).not.toBeInTheDocument();
    });

    // Open dialog again - should not have old search text pre-filled
    await user.click(screen.getByRole('button', { name: /create donor/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveValue('');
    });
  });

  it('clears pre-fill data when dialog closes without creating donor', async () => {
    const user = userEvent.setup();
    render(<DonationForm />);

    // Type in donor autocomplete
    const donorField = screen.getByRole('combobox', { name: /donor/i });
    await user.type(donorField, 'Test Name');

    // Open dialog - should pre-fill name
    await user.click(screen.getByRole('button', { name: /create donor/i }));

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByText('Create New Donor')).toBeInTheDocument();
    });

    // Verify name is pre-filled
    const nameFields = screen.getAllByLabelText(/name/i);
    const dialogNameField = nameFields.find(
      (field) => (field as HTMLInputElement).value === 'Test Name'
    );
    expect(dialogNameField).toHaveValue('Test Name');

    // Close dialog without creating donor
    await user.click(screen.getByRole('button', { name: /close/i }));

    // Wait for dialog to close completely
    await waitFor(
      () => {
        expect(screen.queryByText('Create New Donor')).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // Reopen dialog - should be blank
    await user.click(screen.getByRole('button', { name: /create donor/i }));

    // Wait for dialog to reopen
    await waitFor(() => {
      expect(screen.getByText('Create New Donor')).toBeInTheDocument();
    });

    // Verify name field is now empty
    const reopenedNameFields = screen.getAllByLabelText(/name/i);
    const reopenedDialogNameField = reopenedNameFields.find((field) => {
      const input = field as HTMLInputElement;
      return input.type === 'text' && input.value === '';
    });
    expect(reopenedDialogNameField).toHaveValue('');
  });

  it('pre-fills email when typed text is valid email', async () => {
    const user = userEvent.setup();
    render(<DonationForm />);

    // Type valid email in donor autocomplete
    const donorField = screen.getByRole('combobox', { name: /donor/i });
    await user.type(donorField, 'test@example.com');

    // Open create donor dialog
    await user.click(screen.getByRole('button', { name: /create donor/i }));

    // Verify email pre-filled
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toHaveValue('test@example.com');
    });
  });

  it('clicking create project icon opens QuickEntityCreateDialog', async () => {
    const user = userEvent.setup();
    render(<DonationForm />);

    // Find and click the create entity icon button
    const createButton = screen.getByRole('button', {
      name: /create project or child/i,
    });
    await user.click(createButton);

    // Dialog should appear
    expect(screen.getByText('Create New Entity')).toBeInTheDocument();
  });

  it('created project auto-selects in ProjectOrChildAutocomplete', async () => {
    const user = userEvent.setup();
    const mockProject = {
      id: 10,
      title: 'New Campaign',
      description: 'Campaign description',
      project_type: 'campaign',
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { project: mockProject },
    });

    render(<DonationForm />);

    // Open dialog
    const createButton = screen.getByRole('button', {
      name: /create project or child/i,
    });
    await user.click(createButton);

    // Switch to project tab
    const projectTab = screen.getByRole('tab', { name: /create project/i });
    await user.click(projectTab);

    // Fill out and submit form
    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/title/i), 'New Campaign');
    await user.type(
      screen.getByLabelText(/description/i),
      'Campaign description'
    );
    await user.click(screen.getByRole('button', { name: /create project/i }));

    // Verify project is auto-selected in autocomplete
    await waitFor(() => {
      const projectField = screen.getByLabelText(/donation for/i);
      expect(projectField).toHaveValue('New Campaign');
    });
  });

  it('tracks project search input when user types in autocomplete', async () => {
    const user = userEvent.setup();

    render(<DonationForm />);

    const projectField = screen.getByRole('combobox', {
      name: /donation for/i,
    });
    await user.type(projectField, 'Christmas');

    // Verify internal state is tracking input (will be used for pre-fill later)
    expect(projectField).toHaveValue('Christmas');
  });

  it('pre-fills project title in dialog when user searches and clicks create', async () => {
    const user = userEvent.setup();
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { project: { id: 1, title: 'Christmas Campaign' } },
    });

    render(<DonationForm />);

    // Type in project autocomplete
    const projectField = screen.getByRole('combobox', {
      name: /donation for/i,
    });
    await user.type(projectField, 'Christmas Campaign');

    // Wait for typing to complete and debounce to settle
    await waitFor(() => {
      expect(projectField).toHaveValue('Christmas Campaign');
    });

    // Click create button
    const createButton = screen.getByRole('button', {
      name: /create project or child/i,
    });
    await user.click(createButton);

    // Verify dialog opened with tabbed interface
    await waitFor(
      () => {
        expect(screen.getByText('Create New Entity')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // Switch to project tab
    const projectTab = screen.getByRole('tab', { name: /create project/i });
    await user.click(projectTab);

    // Verify title field is pre-filled
    await waitFor(
      () => {
        const titleField = screen.getByLabelText(/title/i);
        expect(titleField).toHaveValue('Christmas Campaign');
      },
      { timeout: 2000 }
    );
  });

  it('clears project search input after creating project', async () => {
    const user = userEvent.setup();
    const mockProject = {
      id: 5,
      title: 'New Campaign',
      description: '',
      project_type: 'campaign',
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { project: mockProject },
    });

    render(<DonationForm />);

    // Type in project autocomplete
    const projectField = screen.getByRole('combobox', {
      name: /donation for/i,
    });
    await user.type(projectField, 'New Campaign');

    // Wait for typing to complete
    await waitFor(() => {
      expect(projectField).toHaveValue('New Campaign');
    });

    // Open dialog and create project
    await user.click(
      screen.getByRole('button', { name: /create project or child/i })
    );

    // Wait for dialog to open
    await waitFor(
      () => {
        expect(screen.getByText('Create New Entity')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // Switch to project tab
    const projectTab = screen.getByRole('tab', { name: /create project/i });
    await user.click(projectTab);

    // Submit to create project
    await user.click(screen.getByRole('button', { name: /create project/i }));

    // Wait for dialog to close completely
    await waitFor(
      () => {
        expect(screen.queryByText('Create New Entity')).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // Open dialog again - should not have old search text pre-filled
    await user.click(
      screen.getByRole('button', { name: /create project or child/i })
    );

    // Wait for dialog to reopen
    await waitFor(
      () => {
        expect(screen.getByText('Create New Entity')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // Switch to project tab
    await user.click(screen.getByRole('tab', { name: /create project/i }));

    // Verify title field is empty
    await waitFor(
      () => {
        expect(screen.getByLabelText(/title/i)).toHaveValue('');
      },
      { timeout: 2000 }
    );
  });

  it('clears pre-fill when dialog closes without creating project', async () => {
    const user = userEvent.setup();
    render(<DonationForm />);

    // Type in project autocomplete
    const projectField = screen.getByRole('combobox', {
      name: /donation for/i,
    });
    await user.type(projectField, 'Test Project');

    // Open dialog - should pre-fill title
    await user.click(
      screen.getByRole('button', { name: /create project or child/i })
    );

    // Switch to project tab
    const projectTab = screen.getByRole('tab', { name: /create project/i });
    await user.click(projectTab);

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue('Test Project');
    });

    // Close dialog without creating project
    await user.click(screen.getByRole('button', { name: /close/i }));

    // Wait for dialog to close
    await waitFor(() => {
      expect(screen.queryByText('Create New Entity')).not.toBeInTheDocument();
    });

    // Reopen dialog - should be blank
    await user.click(
      screen.getByRole('button', { name: /create project or child/i })
    );

    // Switch to project tab
    await user.click(screen.getByRole('tab', { name: /create project/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue('');
    });
  });

  it('project dialog can be canceled without losing donation form data', async () => {
    const user = userEvent.setup();
    render(<DonationForm />);

    // Fill out donation form with data
    await user.type(screen.getByLabelText(/amount/i), '250');

    // Open create entity dialog
    const createButton = screen.getByRole('button', {
      name: /create project or child/i,
    });
    await user.click(createButton);

    // Verify dialog is open
    expect(screen.getByText('Create New Entity')).toBeInTheDocument();

    // Close dialog by pressing Escape
    await user.keyboard('{Escape}');

    // Verify dialog is closed
    await waitFor(() => {
      expect(screen.queryByText('Create New Entity')).not.toBeInTheDocument();
    });

    // Verify donation form data is preserved
    expect(screen.getByLabelText(/amount/i)).toHaveValue(250);
  });
});
