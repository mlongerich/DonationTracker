import React from 'react';
import { Box, Button, Container, Typography, Divider } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import DeveloperModeIcon from '@mui/icons-material/DeveloperMode';

const LoginPage: React.FC = () => {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const handleGoogleSignIn = () => {
    window.location.href = `${apiUrl}/auth/google_oauth2`;
  };

  const handleDevLogin = () => {
    window.location.href = `${apiUrl}/auth/dev_login`;
  };

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h4" gutterBottom>
          Donation Tracker
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Sign in to continue
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<GoogleIcon />}
          onClick={handleGoogleSignIn}
          fullWidth
        >
          Sign in with Google
        </Button>

        {isDevelopment && (
          <>
            <Divider sx={{ my: 3, width: '100%' }}>OR</Divider>
            <Button
              variant="outlined"
              size="large"
              startIcon={<DeveloperModeIcon />}
              onClick={handleDevLogin}
              fullWidth
              color="secondary"
            >
              Dev Login (Development Only)
            </Button>
          </>
        )}
      </Box>
    </Container>
  );
};

export default LoginPage;
