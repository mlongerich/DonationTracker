import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { theme } from './theme';
import Layout from './components/Layout';
import DonationsPage from './pages/DonationsPage';
import DonorsPage from './pages/DonorsPage';
import ChildrenPage from './pages/ChildrenPage';
import SponsorshipsPage from './pages/SponsorshipsPage';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<DonationsPage />} />
              <Route path="donations" element={<DonationsPage />} />
              <Route path="donors" element={<DonorsPage />} />
              <Route path="children" element={<ChildrenPage />} />
              <Route path="sponsorships" element={<SponsorshipsPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
