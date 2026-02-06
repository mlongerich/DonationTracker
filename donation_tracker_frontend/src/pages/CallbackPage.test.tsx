import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CallbackPage from './CallbackPage';
import { AuthProvider } from '../contexts/AuthContext';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('CallbackPage', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('extracts token and user from URL params and calls login', async () => {
    const token = 'test_jwt_token';
    const user = { email: 'admin@projectsforasia.com', name: 'Admin', avatar_url: 'https://example.com/avatar.jpg' };
    const userParam = encodeURIComponent(JSON.stringify(user));

    render(
      <MemoryRouter initialEntries={[`/auth/callback?token=${token}&user=${userParam}`]}>
        <AuthProvider>
          <Routes>
            <Route path="/auth/callback" element={<CallbackPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(localStorage.getItem('auth_token')).toBe(token);
      expect(localStorage.getItem('auth_user')).toBe(JSON.stringify(user));
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('redirects to login when token or user params are missing', async () => {
    render(
      <MemoryRouter initialEntries={['/auth/callback']}>
        <AuthProvider>
          <Routes>
            <Route path="/auth/callback" element={<CallbackPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});
