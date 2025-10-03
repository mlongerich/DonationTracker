import { useEffect, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { theme } from './theme';
import DonorForm from './components/DonorForm';
import DonorList from './components/DonorList';
import apiClient from './api/client';

interface Donor {
  id: number;
  name: string;
  email: string;
}

function App() {
  const [donors, setDonors] = useState<Donor[]>([]);

  const fetchDonors = async () => {
    try {
      const response = await apiClient.get('/api/donors');
      setDonors(response.data);
    } catch (error) {
      console.error('Failed to fetch donors:', error);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, []);

  const handleDonorSubmit = (data: { name: string; email: string }) => {
    console.log('Donor submitted:', data);
    fetchDonors();
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="sm">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Donation Tracker
          </Typography>
          <Typography variant="h6" component="h2" gutterBottom>
            Add Donor
          </Typography>
          <DonorForm onSubmit={handleDonorSubmit} />
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Donors
            </Typography>
            <DonorList donors={donors} />
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;
