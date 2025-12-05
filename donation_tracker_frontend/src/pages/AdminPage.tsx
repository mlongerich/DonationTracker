import React, { useState } from 'react';
import { Box, Container, Typography, Tabs, Tab, Button } from '@mui/material';
import Download from '@mui/icons-material/Download';
import PendingReviewSection from '../components/PendingReviewSection';
import ProjectsSection from '../components/ProjectsSection';
import apiClient from '../api/client';

const AdminPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleDonorExport = async () => {
    try {
      const params: Record<string, unknown> = {
        include_discarded: false,
      };

      const response = await apiClient.get('/api/donors/export', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      link.setAttribute('download', `donors_export_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to export donors:', err);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Admin
      </Typography>

      <Tabs value={currentTab} onChange={handleTabChange}>
        <Tab label="Pending Review" />
        <Tab label="CSV" />
        <Tab label="Projects" />
      </Tabs>

      <Box sx={{ mt: 3 }}>
        {currentTab === 0 && <PendingReviewSection />}
        {currentTab === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Export Donors
            </Typography>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleDonorExport}
              sx={{ mb: 3 }}
            >
              Export All Donors to CSV
            </Button>
          </Box>
        )}
        {currentTab === 2 && <ProjectsSection />}
      </Box>
    </Container>
  );
};

export default AdminPage;
