import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../theme';
import DonorForm from './DonorForm';
import apiClient from '../api/client';

jest.mock('../api/client');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('DonorForm', () => {
  it('renders name input field', () => {
    render(
      <ThemeProvider theme={theme}>
        <DonorForm onSubmit={jest.fn()} />
      </ThemeProvider>
    );

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it('renders email input field', () => {
    render(
      <ThemeProvider theme={theme}>
        <DonorForm onSubmit={jest.fn()} />
      </ThemeProvider>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(
      <ThemeProvider theme={theme}>
        <DonorForm onSubmit={jest.fn()} />
      </ThemeProvider>
    );

    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('calls onSubmit with name and email when form is submitted (NEW PATTERN)', async () => {
    const handleSubmit = jest.fn();
    const user = userEvent.setup();

    render(
      <ThemeProvider theme={theme}>
        <DonorForm onSubmit={handleSubmit} />
      </ThemeProvider>
    );

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // NEW PATTERN: onSubmit should be called immediately without API calls
    expect(handleSubmit).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'USA',
    });

    // NEW PATTERN: Form should NOT make API calls
    expect(mockedApiClient.post).not.toHaveBeenCalled();
  });

  it('does not make API calls (NEW PATTERN - parent component responsibility)', async () => {
    const handleSubmit = jest.fn();
    const user = userEvent.setup();

    render(
      <ThemeProvider theme={theme}>
        <DonorForm onSubmit={handleSubmit} />
      </ThemeProvider>
    );

    await user.type(screen.getByLabelText(/name/i), 'Jane Smith');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // NEW PATTERN: Form should NOT make API calls (DonorsPage handles this)
    expect(mockedApiClient.post).not.toHaveBeenCalled();
    expect(mockedApiClient.patch).not.toHaveBeenCalled();
  });

  it('does not show success or error messages (NEW PATTERN - parent component responsibility)', () => {
    render(
      <ThemeProvider theme={theme}>
        <DonorForm onSubmit={jest.fn()} />
      </ThemeProvider>
    );

    // NEW PATTERN: No Alert components in DonorForm
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('pre-fills form when donor prop is provided', () => {
    const donor = {
      id: 1,
      name: 'Existing Donor',
      email: 'existing@example.com',
      displayable_email: 'existing@example.com',
    };

    render(
      <ThemeProvider theme={theme}>
        <DonorForm donor={donor} onSubmit={jest.fn()} />
      </ThemeProvider>
    );

    expect(screen.getByLabelText(/name/i)).toHaveValue('Existing Donor');
    expect(screen.getByLabelText(/email/i)).toHaveValue('existing@example.com');
  });

  it('shows "Update" button text when donor prop is provided', () => {
    const donor = {
      id: 1,
      name: 'Existing Donor',
      email: 'existing@example.com',
      displayable_email: 'existing@example.com',
    };

    render(
      <ThemeProvider theme={theme}>
        <DonorForm donor={donor} onSubmit={jest.fn()} onCancel={jest.fn()} />
      </ThemeProvider>
    );

    expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^submit$/i })
    ).not.toBeInTheDocument();
  });

  it('calls onSubmit with updated data when editing donor (NEW PATTERN)', async () => {
    const donor = {
      id: 1,
      name: 'Original Name',
      email: 'original@example.com',
      displayable_email: 'original@example.com',
    };
    const handleSubmit = jest.fn();
    const user = userEvent.setup();

    render(
      <ThemeProvider theme={theme}>
        <DonorForm donor={donor} onSubmit={handleSubmit} onCancel={jest.fn()} />
      </ThemeProvider>
    );

    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');
    await user.click(screen.getByRole('button', { name: /update/i }));

    // NEW PATTERN: onSubmit called with data, no API calls
    expect(handleSubmit).toHaveBeenCalledWith({
      name: 'Updated Name',
      email: 'original@example.com',
      phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'USA',
    });
    expect(mockedApiClient.patch).not.toHaveBeenCalled();
  });

  it('shows Cancel button when editing donor (donor AND onCancel provided)', () => {
    const donor = {
      id: 1,
      name: 'Existing Donor',
      email: 'existing@example.com',
      displayable_email: 'existing@example.com',
    };
    const mockCancel = jest.fn();

    render(
      <ThemeProvider theme={theme}>
        <DonorForm donor={donor} onSubmit={jest.fn()} onCancel={mockCancel} />
      </ThemeProvider>
    );

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('does not show Cancel button when adding new donor', () => {
    render(
      <ThemeProvider theme={theme}>
        <DonorForm onSubmit={jest.fn()} />
      </ThemeProvider>
    );

    expect(
      screen.queryByRole('button', { name: /cancel/i })
    ).not.toBeInTheDocument();
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    const donor = {
      id: 1,
      name: 'Existing Donor',
      email: 'existing@example.com',
      displayable_email: 'existing@example.com',
    };
    const handleCancel = jest.fn();
    const user = userEvent.setup();

    render(
      <ThemeProvider theme={theme}>
        <DonorForm donor={donor} onSubmit={jest.fn()} onCancel={handleCancel} />
      </ThemeProvider>
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(handleCancel).toHaveBeenCalled();
  });

  it('renders phone and address fields', () => {
    render(
      <ThemeProvider theme={theme}>
        <DonorForm onSubmit={jest.fn()} />
      </ThemeProvider>
    );

    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address line 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address line 2/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/zip/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
  });
});
