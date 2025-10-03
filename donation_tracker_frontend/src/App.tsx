import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { theme } from './theme';
import DonorForm from './components/DonorForm';

function App() {
  const handleDonorSubmit = (data: { name: string; email: string }) => {
    console.log('Donor submitted:', data);
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
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;
