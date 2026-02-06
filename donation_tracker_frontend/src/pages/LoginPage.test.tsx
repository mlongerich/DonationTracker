import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import { AuthProvider } from '../contexts/AuthContext';

describe('LoginPage', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  const renderLoginPage = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('renders sign in with Google button', () => {
    renderLoginPage();

    expect(screen.getByText(/sign in with google/i)).toBeInTheDocument();
  });

  it('clicking sign in button redirects to Google OAuth endpoint', () => {
    // Mock window.location.href
    delete (window as any).location;
    (window as any).location = { href: '' };

    renderLoginPage();

    const signInButton = screen.getByText(/sign in with google/i);
    signInButton.click();

    expect(window.location.href).toBe(
      'http://localhost:3001/auth/google_oauth2'
    );
  });

  it('renders dev login button in development mode', () => {
    process.env = { ...originalEnv, NODE_ENV: 'development' };

    renderLoginPage();

    expect(screen.getByText(/dev login/i)).toBeInTheDocument();
  });

  it('does not render dev login button in production mode', () => {
    process.env = { ...originalEnv, NODE_ENV: 'production' };

    renderLoginPage();

    expect(screen.queryByText(/dev login/i)).not.toBeInTheDocument();
  });

  it('clicking dev login button redirects to dev_login endpoint', () => {
    process.env = { ...originalEnv, NODE_ENV: 'development' };
    delete (window as any).location;
    (window as any).location = { href: '' };

    renderLoginPage();

    const devLoginButton = screen.getByText(/dev login/i);
    devLoginButton.click();

    expect(window.location.href).toBe('http://localhost:3001/auth/dev_login');
  });
});
