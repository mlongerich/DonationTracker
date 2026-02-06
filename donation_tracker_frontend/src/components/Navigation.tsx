import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Button, Box, Typography } from '@mui/material';
import { useAuth } from '../hooks/useAuth';

const Navigation = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Donation Tracker
        </Typography>
        <Box>
          <Button color="inherit" component={RouterLink} to="/donations">
            Donations
          </Button>
          <Button color="inherit" component={RouterLink} to="/donors">
            Donors
          </Button>
          <Button color="inherit" component={RouterLink} to="/children">
            Children
          </Button>
          <Button color="inherit" component={RouterLink} to="/sponsorships">
            Sponsorships
          </Button>
          <Button color="inherit" component={RouterLink} to="/reports">
            Reports
          </Button>
          <Button color="inherit" component={RouterLink} to="/admin">
            Admin
          </Button>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
