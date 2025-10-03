import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./api/client');

test('renders with MUI ThemeProvider', () => {
  render(<App />);
  expect(screen.getByText('Donation Tracker')).toBeInTheDocument();
});
