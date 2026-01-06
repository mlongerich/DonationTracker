import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
} from '@mui/material';
import { Download, ExpandMore } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import apiClient from '../api/client';

interface DonationRow {
  date: string;
  donor_name: string;
  amount: string;
  project_or_child: string;
  payment_method: string;
  all_time_total: string;
  project_id: number;
}

interface DonorSummaryRow {
  donor_name: string;
  period_total: string;
  all_time_total: string;
}

interface ProjectSummaryRow {
  project_id: number;
  project_name: string;
  period_total: string;
  all_time_total: string;
}

interface ReportData {
  donations: DonationRow[];
  donor_summary: DonorSummaryRow[];
  project_summary: ProjectSummaryRow[];
  meta: {
    start_date: string;
    end_date: string;
    total_count: number;
    total_amount: string;
  };
}

const ReportsPage: React.FC = () => {
  const [startDate, setStartDate] = useState<Dayjs | null>(
    dayjs().startOf('year') // Default: Jan 1 of current year
  );
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs()); // Default: today
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [expandedDonors, setExpandedDonors] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set()
  );

  const toggleDonorExpand = (donorName: string) => {
    setExpandedDonors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(donorName)) {
        newSet.delete(donorName);
      } else {
        newSet.add(donorName);
      }
      return newSet;
    });
  };

  const toggleProjectExpand = (projectName: string) => {
    setExpandedProjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectName)) {
        newSet.delete(projectName);
      } else {
        newSet.add(projectName);
      }
      return newSet;
    });
  };

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/api/reports/donations', {
        params: {
          start_date: startDate.format('YYYY-MM-DD'),
          end_date: endDate.format('YYYY-MM-DD'),
          format: 'json',
        },
      });

      setReportData(response.data);
      // Reset expanded state when new report is generated
      setExpandedDonors(new Set());
      setExpandedProjects(new Set());
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/api/reports/donations', {
        params: {
          start_date: startDate.format('YYYY-MM-DD'),
          end_date: endDate.format('YYYY-MM-DD'),
        },
        responseType: 'blob',
      });

      // Trigger file download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = `donations_report_${startDate.format('YYYYMMDD')}_${endDate.format('YYYYMMDD')}.csv`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to download report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Donation Reports
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Generate a detailed report showing each donation as an individual row
        with donor contact info and aggregated totals.
      </Typography>

      {/* Date Range Selectors */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <DatePicker
          label="Start Date"
          value={startDate}
          onChange={(newValue) => setStartDate(newValue)}
          slotProps={{
            textField: {
              size: 'small',
              fullWidth: true,
            },
          }}
        />
        <DatePicker
          label="End Date"
          value={endDate}
          onChange={(newValue) => setEndDate(newValue)}
          slotProps={{
            textField: {
              size: 'small',
              fullWidth: true,
            },
          }}
        />
      </Box>

      {/* Generate Report Button */}
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleGenerateReport}
        disabled={!startDate || !endDate || loading}
        sx={{ mb: 3 }}
      >
        {loading ? 'Generating Report...' : 'Generate Report'}
      </Button>

      {/* Report Data - 3 Sections */}
      {reportData && (
        <>
          {/* Section 1: Donations */}
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Donations
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Donor Name</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Project/Child</TableCell>
                  <TableCell>Payment Method</TableCell>
                  <TableCell>All-Time Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.donations.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.donor_name}</TableCell>
                    <TableCell>{row.amount}</TableCell>
                    <TableCell>{row.project_or_child}</TableCell>
                    <TableCell>{row.payment_method}</TableCell>
                    <TableCell>{row.all_time_total}</TableCell>
                  </TableRow>
                ))}
                {/* Total Row */}
                <TableRow>
                  <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>
                    Total:
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>
                    {reportData.meta.total_amount}
                  </TableCell>
                  <TableCell colSpan={3} />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Section 2: Donor Summary */}
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Donor Summary
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Donor Name</TableCell>
                  <TableCell>Period Total</TableCell>
                  <TableCell>All-Time Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.donor_summary.map((row, index) => {
                  const isExpanded = expandedDonors.has(row.donor_name);
                  const donorDonations = reportData.donations.filter(
                    (d) => d.donor_name === row.donor_name
                  );

                  return (
                    <React.Fragment key={index}>
                      <TableRow
                        hover
                        onClick={() => toggleDonorExpand(row.donor_name)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <IconButton
                            size="small"
                            sx={{
                              transform: isExpanded
                                ? 'rotate(180deg)'
                                : 'rotate(0deg)',
                              transition: 'transform 0.3s',
                            }}
                          >
                            <ExpandMore />
                          </IconButton>
                        </TableCell>
                        <TableCell>{row.donor_name}</TableCell>
                        <TableCell>{row.period_total}</TableCell>
                        <TableCell>{row.all_time_total}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={4} sx={{ p: 0 }}>
                          <Collapse
                            in={isExpanded}
                            timeout="auto"
                            unmountOnExit
                          >
                            <Box sx={{ bgcolor: 'grey.50', p: 2 }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Amount</TableCell>
                                    <TableCell>Project/Child</TableCell>
                                    <TableCell>Payment Method</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {donorDonations.map(
                                    (donation, donationIndex) => (
                                      <TableRow key={donationIndex}>
                                        <TableCell>{donation.date}</TableCell>
                                        <TableCell>{donation.amount}</TableCell>
                                        <TableCell>
                                          {donation.project_or_child}
                                        </TableCell>
                                        <TableCell>
                                          {donation.payment_method}
                                        </TableCell>
                                      </TableRow>
                                    )
                                  )}
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Section 3: Project Summary */}
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Project Summary
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Project Name</TableCell>
                  <TableCell>Period Total</TableCell>
                  <TableCell>All-Time Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.project_summary.map((row, index) => {
                  const isExpanded = expandedProjects.has(row.project_name);
                  const projectDonations = reportData.donations.filter(
                    (d) => d.project_id === row.project_id
                  );

                  return (
                    <React.Fragment key={index}>
                      <TableRow
                        hover
                        onClick={() => toggleProjectExpand(row.project_name)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <IconButton
                            size="small"
                            sx={{
                              transform: isExpanded
                                ? 'rotate(180deg)'
                                : 'rotate(0deg)',
                              transition: 'transform 0.3s',
                            }}
                          >
                            <ExpandMore />
                          </IconButton>
                        </TableCell>
                        <TableCell>{row.project_name}</TableCell>
                        <TableCell>{row.period_total}</TableCell>
                        <TableCell>{row.all_time_total}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={4} sx={{ p: 0 }}>
                          <Collapse
                            in={isExpanded}
                            timeout="auto"
                            unmountOnExit
                          >
                            <Box sx={{ bgcolor: 'grey.50', p: 2 }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Donor Name</TableCell>
                                    <TableCell>Amount</TableCell>
                                    <TableCell>Payment Method</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {projectDonations.map(
                                    (donation, donationIndex) => (
                                      <TableRow key={donationIndex}>
                                        <TableCell>{donation.date}</TableCell>
                                        <TableCell>
                                          {donation.donor_name}
                                        </TableCell>
                                        <TableCell>{donation.amount}</TableCell>
                                        <TableCell>
                                          {donation.payment_method}
                                        </TableCell>
                                      </TableRow>
                                    )
                                  )}
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Download CSV Button (optional action) */}
          <Button
            variant="outlined"
            color="primary"
            fullWidth
            startIcon={<Download />}
            onClick={handleDownload}
            disabled={!startDate || !endDate || loading}
          >
            {loading ? 'Generating Report...' : 'Download CSV Report'}
          </Button>
        </>
      )}

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setError(null)}
          severity="error"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReportsPage;
