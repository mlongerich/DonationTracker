import { Outlet } from 'react-router-dom';
import { Container, Box } from '@mui/material';
import Navigation from './Navigation';

const Layout = () => {
  return (
    <>
      <Navigation />
      <Container maxWidth="sm">
        <Box sx={{ my: 4 }}>
          <Outlet />
        </Box>
      </Container>
    </>
  );
};

export default Layout;
