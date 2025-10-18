## [TICKET-036] Implement React Error Boundary

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Effort:** S (Small)
**Created:** 2025-10-18
**Dependencies:** None

### User Story
As a user, I want to see a helpful error message when something goes wrong in the application so that I understand there's an issue and can take appropriate action instead of seeing a blank screen.

### Problem Statement
Currently, if a React component crashes due to an error:
- User sees a blank white screen
- No error message or recovery options
- No logging of what went wrong
- Application becomes unusable

**Code Smell:** Missing error handling at component boundary level
**Issue:** Poor user experience during errors, no error tracking

### Acceptance Criteria
- [ ] Create `ErrorBoundary` component to catch React errors
- [ ] Wrap main application with ErrorBoundary
- [ ] Display user-friendly error message when crashes occur
- [ ] Provide "Reload" button to recover
- [ ] Log errors to console (and future error tracking service)
- [ ] Add tests for ErrorBoundary component
- [ ] Test crash scenarios in development
- [ ] Update CLAUDE.md with Error Boundary pattern

### Technical Approach

#### 1. Create ErrorBoundary Component

```tsx
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so next render shows fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console (and future error tracking service)
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // TODO: Send to error tracking service when implemented
    // logErrorToService(error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided by parent
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Container maxWidth="md">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              py: 4,
            }}
          >
            <Paper
              elevation={3}
              sx={{
                p: 4,
                textAlign: 'center',
                maxWidth: 500,
              }}
            >
              <ErrorOutlineIcon
                color="error"
                sx={{ fontSize: 64, mb: 2 }}
              />
              <Typography variant="h4" component="h1" gutterBottom>
                Oops! Something went wrong
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                We're sorry, but something unexpected happened. The error has been logged
                and we'll look into it.
              </Typography>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Box
                  sx={{
                    mt: 3,
                    p: 2,
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                    textAlign: 'left',
                    overflow: 'auto',
                  }}
                >
                  <Typography variant="caption" component="pre" sx={{ fontSize: '0.75rem' }}>
                    {this.state.error.toString()}
                    {'\n\n'}
                    {this.state.errorInfo?.componentStack}
                  </Typography>
                </Box>
              )}

              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={this.handleReset}
                >
                  Try Again
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </Button>
              </Box>
            </Paper>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

#### 2. Wrap App with ErrorBoundary

```tsx
// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

reportWebVitals();
```

#### 3. Optional: Granular Error Boundaries

```tsx
// src/pages/DonorsPage.tsx
import ErrorBoundary from '../components/ErrorBoundary';

const DonorsPage = () => {
  return (
    <ErrorBoundary
      fallback={
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error">
            Failed to load donor list. Please try refreshing the page.
          </Typography>
        </Box>
      }
    >
      {/* Donor management UI */}
    </ErrorBoundary>
  );
};
```

### Error Logging Integration (Future)

```tsx
// src/services/errorTracking.ts
export const logErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
  // Example: Send to Sentry, LogRocket, or custom backend
  if (process.env.NODE_ENV === 'production') {
    // Sentry.captureException(error, { contexts: { react: errorInfo } });

    // Or custom backend
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      }),
    }).catch(console.error);
  }
};
```

### Benefits
- **User Experience**: Graceful error handling instead of blank screen
- **Recovery**: Users can try again or reload without losing context
- **Debugging**: Errors logged for investigation
- **Production Ready**: Hide technical details from users, show in development
- **Customizable**: Can provide different fallbacks for different boundaries
- **Future-Ready**: Easy to integrate error tracking services

### Testing Strategy

```tsx
// src/components/ErrorBoundary.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from './ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Working component</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error for cleaner test output
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/try again/i)).toBeInTheDocument();
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/test error/i)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom Error Message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error Message')).toBeInTheDocument();
  });

  it('resets error state when Try Again clicked', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Click Try Again
    await user.click(screen.getByText(/try again/i));

    // Re-render with non-throwing component
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });
});
```

### Manual Testing Scenarios

Create a test component to trigger errors in development:

```tsx
// src/components/ErrorTrigger.tsx (development only)
import { useState } from 'react';
import { Button, Box } from '@mui/material';

const ErrorTrigger = () => {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('Manually triggered error for testing');
  }

  return (
    <Box sx={{ p: 2 }}>
      <Button
        variant="outlined"
        color="error"
        onClick={() => setShouldThrow(true)}
      >
        Trigger Error (Test ErrorBoundary)
      </Button>
    </Box>
  );
};

export default ErrorTrigger;
```

### Error Boundary Limitations

**Error Boundaries DO catch:**
- Errors in render phase
- Errors in lifecycle methods
- Errors in constructors of child components

**Error Boundaries DO NOT catch:**
- Event handlers (use try-catch)
- Asynchronous code (use .catch())
- Server-side rendering errors
- Errors in the ErrorBoundary itself

**For event handlers:**
```tsx
const handleClick = async () => {
  try {
    await riskyOperation();
  } catch (error) {
    console.error('Error in event handler:', error);
    // Show user-friendly message
    setError('Failed to perform operation');
  }
};
```

### Files to Create
- `src/components/ErrorBoundary.tsx` (NEW)
- `src/components/ErrorBoundary.test.tsx` (NEW)
- `src/components/ErrorTrigger.tsx` (NEW - dev only)
- `src/services/errorTracking.ts` (NEW - placeholder for future)

### Files to Modify
- `src/index.tsx` (WRAP App with ErrorBoundary)
- `CLAUDE.md` (UPDATE - add Error Boundary pattern)

### Future Enhancements
- Integrate with Sentry or other error tracking service
- Add error recovery strategies (retry logic)
- Implement error boundaries at route level with React Router
- Add user feedback form on error screen
- Track error frequency and patterns
- Implement circuit breaker for repeated errors

### Related Tickets
- TICKET-030: Can add ErrorBoundaries at page level when multi-page architecture implemented
- Part of code quality improvement initiative

### Notes
- ErrorBoundary must be class component (React requirement)
- Only catches errors in React tree below it
- Production vs development behavior differs (hide stack traces in production)
- Consider multiple error boundaries for better isolation
- Test error scenarios thoroughly before production deployment
