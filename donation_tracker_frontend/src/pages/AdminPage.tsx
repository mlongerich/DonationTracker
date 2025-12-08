import React, { useState } from 'react';
import { Box, Container, Typography, Tabs, Tab, Button } from '@mui/material';
import Download from '@mui/icons-material/Download';
import PendingReviewSection from '../components/PendingReviewSection';
import ProjectsSection from '../components/ProjectsSection';
import apiClient from '../api/client';

interface ImportResult {
  success_count: number;
  skipped_count: number;
  failed_count: number;
  needs_attention_count: number;
  errors: Array<{ row: number; error: string }>;
  error?: string;
}

const AdminPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/api/admin/import/stripe_payments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 minute timeout for large CSV imports
      });
      setResult(response.data);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Upload failed: An unexpected error occurred';
      setResult({
        success_count: 0,
        skipped_count: 0,
        failed_count: 0,
        needs_attention_count: 0,
        errors: [],
        error: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearResult = () => {
    setFile(null);
    setResult(null);
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
              fullWidth
              sx={{ mb: 4 }}
            >
              Export All Donors to CSV
            </Button>

            <Typography variant="h6" gutterBottom>
              Stripe CSV Import
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Import creates both donors and donations from Stripe payment exports
            </Typography>

            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="csv-file-input">
              <Button
                variant="outlined"
                component="span"
                fullWidth
                sx={{ mb: 2 }}
              >
                Choose File
              </Button>
            </label>

            {file && (
              <Typography variant="body2" sx={{ mb: 2 }}>
                Selected: {file.name}
              </Typography>
            )}

            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={!file || loading}
              fullWidth
              sx={{ mb: 2 }}
            >
              {loading ? 'Importing...' : 'Import Stripe CSV'}
            </Button>

            {result && (
              <Box sx={{ mt: 3 }}>
                {result.error ? (
                  <Typography color="error">{result.error}</Typography>
                ) : (
                  <>
                    <Typography color="success.main">
                      ✅ Succeeded: {result.success_count} donations
                    </Typography>
                    {result.skipped_count > 0 && (
                      <Typography color="info.main">
                        ⏭️ Skipped: {result.skipped_count} duplicates
                      </Typography>
                    )}
                    {result.needs_attention_count > 0 && (
                      <Typography color="warning.main">
                        ⚠️ Needs Attention: {result.needs_attention_count} donations
                      </Typography>
                    )}
                    {result.failed_count > 0 && (
                      <Typography color="error">
                        ❌ Failed: {result.failed_count} donations
                      </Typography>
                    )}
                  </>
                )}
                <Button
                  variant="outlined"
                  onClick={handleClearResult}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  Clear
                </Button>
              </Box>
            )}
          </Box>
        )}
        {currentTab === 2 && <ProjectsSection />}
      </Box>
    </Container>
  );
};

export default AdminPage;
