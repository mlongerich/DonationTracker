import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import apiClient from './api/client';

jest.mock('./api/client');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

test('renders with MUI ThemeProvider', () => {
  mockedApiClient.get.mockResolvedValue({
    data: {
      donors: [],
      meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 25 },
    },
  });
  render(<App />);
  expect(screen.getByText('Donation Tracker')).toBeInTheDocument();
});

test('fetches and displays donors on mount', async () => {
  const mockDonors = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  ];

  mockedApiClient.get.mockResolvedValue({
    data: {
      donors: mockDonors,
      meta: { total_count: 2, total_pages: 1, current_page: 1, per_page: 25 },
    },
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
  expect(screen.getByText('jane@example.com')).toBeInTheDocument();
});

test('passes donor to DonorForm when edit button clicked', async () => {
  const user = userEvent.setup();
  const mockDonors = [{ id: 1, name: 'John Doe', email: 'john@example.com' }];

  mockedApiClient.get.mockResolvedValue({
    data: {
      donors: mockDonors,
      meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 25 },
    },
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  const editButton = screen.getByRole('button', { name: /edit/i });
  await user.click(editButton);

  // Form should be pre-filled with donor data
  expect(screen.getByLabelText(/name/i)).toHaveValue('John Doe');
  expect(screen.getByLabelText(/email/i)).toHaveValue('john@example.com');
  // Button should say "Update"
  expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
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
    .mockResolvedValueOnce({
      data: {
        donors: initialDonors,
        meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 25 },
      },
    })
    .mockResolvedValueOnce({
      data: {
        donors: updatedDonors,
        meta: { total_count: 2, total_pages: 1, current_page: 1, per_page: 25 },
      },
    });

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

test('clears editing state when Cancel button is clicked', async () => {
  const user = userEvent.setup();
  const mockDonors = [{ id: 1, name: 'John Doe', email: 'john@example.com' }];

  mockedApiClient.get.mockResolvedValue({
    data: {
      donors: mockDonors,
      meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 25 },
    },
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  // Click edit button
  const editButton = screen.getByRole('button', { name: /edit/i });
  await user.click(editButton);

  // Verify form is in edit mode
  expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();

  // Click cancel button
  const cancelButton = screen.getByRole('button', { name: /cancel/i });
  await user.click(cancelButton);

  // Verify form returned to add mode
  expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: /cancel/i })
  ).not.toBeInTheDocument();
});
