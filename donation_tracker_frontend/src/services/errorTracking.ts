import { ErrorInfo } from 'react';

export const logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
  // TODO: Send to error tracking service when implemented
  // Example: Sentry, LogRocket, or custom backend

  if (process.env.NODE_ENV === 'production') {
    // Sentry.captureException(error, { contexts: { react: errorInfo } });
    // Or custom backend
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     error: error.toString(),
    //     stack: error.stack,
    //     componentStack: errorInfo.componentStack,
    //     timestamp: new Date().toISOString(),
    //   }),
    // }).catch(console.error);
  }
};
