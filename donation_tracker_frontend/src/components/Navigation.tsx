import { Link as RouterLink } from 'react-router-dom';
import { AppBar, Toolbar, Button, Box, Typography } from '@mui/material';

const Navigation = () => {
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
          <Button color="inherit" component={RouterLink} to="/projects">
            Projects
          </Button>
          <Button color="inherit" component={RouterLink} to="/children">
            Children
          </Button>
          <Button color="inherit" component={RouterLink} to="/sponsorships">
            Sponsorships
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
