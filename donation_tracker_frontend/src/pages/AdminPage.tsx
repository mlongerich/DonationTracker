import React, { useState } from 'react';
import { Box, Container, Typography, Tabs, Tab } from '@mui/material';
import PendingReviewSection from '../components/PendingReviewSection';

const AdminPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Admin
      </Typography>

      <Tabs value={currentTab} onChange={handleTabChange}>
        <Tab label="Pending Review" />
        <Tab label="CSV Import" />
      </Tabs>

      <Box sx={{ mt: 3 }}>
        {currentTab === 0 && <PendingReviewSection />}
        {currentTab === 1 && <Typography>CSV Import coming soon</Typography>}
      </Box>
    </Container>
  );
};

export default AdminPage;
