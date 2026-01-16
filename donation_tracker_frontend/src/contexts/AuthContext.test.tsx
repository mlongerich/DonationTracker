import { render, screen, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import { AuthProvider, AuthContext } from './AuthContext';

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('AuthProvider', () => {
    it('renders children', () => {
      render(
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      );

      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('provides default authentication state', async () => {
      const TestComponent = () => {
        const { user, token, loading, isAuthenticated } = useContext(AuthContext);
        return (
          <div>
            <span data-testid="user">{user === null ? 'null' : 'not-null'}</span>
            <span data-testid="token">{token === null ? 'null' : 'not-null'}</span>
            <span data-testid="loading">{loading.toString()}</span>
            <span data-testid="isAuthenticated">{isAuthenticated.toString()}</span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('token')).toHaveTextContent('null');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    });

    it('login updates state and stores in localStorage', async () => {
      const TestComponent = () => {
        const { user, token, login } = useContext(AuthContext);
        return (
          <div>
            <button
              onClick={() =>
                login('test_token_123', {
                  id: 1,
                  email: 'admin@projectsforasia.com',
                  name: 'Admin User',
                  avatar_url: 'https://example.com/avatar.jpg',
                })
              }
            >
              Login
            </button>
            <span data-testid="user-email">{user?.email || 'no-user'}</span>
            <span data-testid="token">{token || 'no-token'}</span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const loginButton = screen.getByText('Login');
      loginButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('admin@projectsforasia.com');
      });

      expect(screen.getByTestId('token')).toHaveTextContent('test_token_123');
      expect(localStorage.getItem('auth_token')).toBe('test_token_123');
      expect(localStorage.getItem('auth_user')).toBe(
        JSON.stringify({
          id: 1,
          email: 'admin@projectsforasia.com',
          name: 'Admin User',
          avatar_url: 'https://example.com/avatar.jpg',
        })
      );
    });

    it('logout clears state and removes from localStorage', async () => {
      const TestComponent = () => {
        const { user, token, login, logout } = useContext(AuthContext);
        return (
          <div>
            <button
              onClick={() =>
                login('test_token_123', {
                  id: 1,
                  email: 'admin@projectsforasia.com',
                  name: 'Admin User',
                  avatar_url: 'https://example.com/avatar.jpg',
                })
              }
            >
              Login
            </button>
            <button onClick={logout}>Logout</button>
            <span data-testid="user-email">{user?.email || 'no-user'}</span>
            <span data-testid="token">{token || 'no-token'}</span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // First login
      const loginButton = screen.getByText('Login');
      loginButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('admin@projectsforasia.com');
      });

      // Then logout
      const logoutButton = screen.getByText('Logout');
      logoutButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('no-user');
      });

      expect(screen.getByTestId('token')).toHaveTextContent('no-token');
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
    });

    it('loads authentication state from localStorage on mount', async () => {
      // Pre-populate localStorage
      localStorage.setItem('auth_token', 'stored_token_456');
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          id: 2,
          email: 'stored@projectsforasia.com',
          name: 'Stored User',
          avatar_url: 'https://example.com/stored.jpg',
        })
      );

      const TestComponent = () => {
        const { user, token, loading } = useContext(AuthContext);
        return (
          <div>
            <span data-testid="loading">{loading.toString()}</span>
            <span data-testid="user-email">{user?.email || 'no-user'}</span>
            <span data-testid="token">{token || 'no-token'}</span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Should load from localStorage
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user-email')).toHaveTextContent('stored@projectsforasia.com');
      expect(screen.getByTestId('token')).toHaveTextContent('stored_token_456');
    });

    it('isAuthenticated returns true when user and token are present', async () => {
      const TestComponent = () => {
        const { isAuthenticated, login } = useContext(AuthContext);
        return (
          <div>
            <button
              onClick={() =>
                login('test_token_789', {
                  id: 3,
                  email: 'test@projectsforasia.com',
                  name: 'Test User',
                  avatar_url: 'https://example.com/test.jpg',
                })
              }
            >
              Login
            </button>
            <span data-testid="isAuthenticated">{isAuthenticated.toString()}</span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Initially false
      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      });

      // After login, should be true
      const loginButton = screen.getByText('Login');
      loginButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });
    });
  });
});
