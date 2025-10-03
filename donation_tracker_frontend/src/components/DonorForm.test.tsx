import { render, screen, waitFor } from '@testing-library/react';
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
        <DonorForm />
      </ThemeProvider>
    );

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it('renders email input field', () => {
    render(
      <ThemeProvider theme={theme}>
        <DonorForm />
      </ThemeProvider>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(
      <ThemeProvider theme={theme}>
        <DonorForm />
      </ThemeProvider>
    );

    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('calls onSubmit with name and email when form is submitted', async () => {
    mockedApiClient.post.mockResolvedValue({
      data: { id: 1 },
      status: 201,
      statusText: 'Created',
      headers: {},
      config: {} as any,
    });

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

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
      });
    });
  });

  it('posts donor data to API when submitted', async () => {
    mockedApiClient.post.mockResolvedValue({
      data: { id: 1, name: 'Jane Smith', email: 'jane@example.com' },
      status: 201,
      statusText: 'Created',
      headers: {},
      config: {} as any,
    });

    const user = userEvent.setup();

    render(
      <ThemeProvider theme={theme}>
        <DonorForm />
      </ThemeProvider>
    );

    await user.type(screen.getByLabelText(/name/i), 'Jane Smith');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(mockedApiClient.post).toHaveBeenCalledWith('/api/donors', {
        donor: {
          name: 'Jane Smith',
          email: 'jane@example.com',
        },
      });
    });
  });

  it('shows success message after donor is created', async () => {
    mockedApiClient.post.mockResolvedValue({
      data: { id: 1, name: 'Jane Smith', email: 'jane@example.com' },
      status: 201,
      statusText: 'Created',
      headers: {},
      config: {} as any,
    });

    const user = userEvent.setup();

    render(
      <ThemeProvider theme={theme}>
        <DonorForm />
      </ThemeProvider>
    );

    await user.type(screen.getByLabelText(/name/i), 'Jane Smith');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/donor created successfully/i)
      ).toBeInTheDocument();
    });
  });

  it('clears form fields after successful submission', async () => {
    mockedApiClient.post.mockResolvedValue({
      data: { id: 1, name: 'Test', email: 'test@example.com' },
      status: 201,
      statusText: 'Created',
      headers: {},
      config: {} as any,
    });

    const user = userEvent.setup();

    render(
      <ThemeProvider theme={theme}>
        <DonorForm />
      </ThemeProvider>
    );

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);

    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'test@example.com');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(nameInput).toHaveValue('');
    });
    expect(emailInput).toHaveValue('');
  });

  it('shows "updated" message when API returns 200 status', async () => {
    mockedApiClient.post.mockResolvedValue({
      data: { id: 1, name: 'Updated', email: 'test@example.com' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const user = userEvent.setup();

    render(
      <ThemeProvider theme={theme}>
        <DonorForm />
      </ThemeProvider>
    );

    await user.type(screen.getByLabelText(/name/i), 'Updated Name');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/donor updated successfully/i)
      ).toBeInTheDocument();
    });
  });
});
