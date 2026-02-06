import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { theme } from './theme';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import CallbackPage from './pages/CallbackPage';
import DonationsPage from './pages/DonationsPage';
import DonorsPage from './pages/DonorsPage';
import ChildrenPage from './pages/ChildrenPage';
import SponsorshipsPage from './pages/SponsorshipsPage';
import ReportsPage from './pages/ReportsPage';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<CallbackPage />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<ProtectedRoute><DonationsPage /></ProtectedRoute>} />
                <Route path="donations" element={<ProtectedRoute><DonationsPage /></ProtectedRoute>} />
                <Route path="donors" element={<ProtectedRoute><DonorsPage /></ProtectedRoute>} />
                <Route path="children" element={<ProtectedRoute><ChildrenPage /></ProtectedRoute>} />
                <Route path="sponsorships" element={<ProtectedRoute><SponsorshipsPage /></ProtectedRoute>} />
                <Route path="reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
                <Route path="admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
