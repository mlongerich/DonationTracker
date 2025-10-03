import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import apiClient from './api/client';

jest.mock('./api/client');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

test('renders with MUI ThemeProvider', () => {
  mockedApiClient.get.mockResolvedValue({ data: [] });
  render(<App />);
  expect(screen.getByText('Donation Tracker')).toBeInTheDocument();
});

test('fetches and displays donors on mount', async () => {
  const mockDonors = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  ];

  mockedApiClient.get.mockResolvedValue({ data: mockDonors });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
  expect(screen.getByText('jane@example.com')).toBeInTheDocument();
});

test('refreshes donor list after successful form submission', async () => {
  const user = userEvent.setup();
  const initialDonors = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
  ];
  const updatedDonors = [
    { id: 2, name: 'New Donor', email: 'new@example.com' },
    { id: 1, name: 'John Doe', email: 'john@example.com' },
  ];

  mockedApiClient.get
    .mockResolvedValueOnce({ data: initialDonors })
    .mockResolvedValueOnce({ data: updatedDonors });

  mockedApiClient.post.mockResolvedValue({
    status: 201,
    data: { id: 2, name: 'New Donor', email: 'new@example.com' },
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  const nameInput = screen.getByLabelText(/name/i);
  const emailInput = screen.getByLabelText(/email/i);

  await user.type(nameInput, 'New Donor');
  await user.type(emailInput, 'new@example.com');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  await waitFor(() => {
    expect(screen.getByText('New Donor')).toBeInTheDocument();
  });
});
