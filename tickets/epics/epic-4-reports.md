---
updated: 2026-06-24
---

# Epic 4 – Reports and Giving Statements

**Goal:** Give admin the ability to generate and download donation reports (monthly, quarterly, annual) and per-donor giving statements in PDF format. Internal reports show gross and net amounts. Donor-facing reports show gross only.

**Demo signal:** Admin selects a date range, generates a monthly report, views it in-app, downloads it as PDF, and downloads it as CSV. Then generates a PDF giving statement for one donor.

**Status:** Not started. Depends on Epic 1 (stripe_fee_cents must exist for net amount calculation).

---

## Depends on

Epic 1 – stripe_fee_cents column must exist before report net-amount calculations are meaningful.

---

## ADR reference

PDF generation: Prawn + prawn-table. Decided 2026-06-24. See `docs/adr-pdf-generation.md`.

---

## Scope

**In:**
- Add `prawn` and `prawn-table` gems
- `DonationReportPdf` service: header (org name, date range, type), donation table, totals footer
- Gross vs net columns: internal reports show both, donor-facing shows gross only (BL-50)
- `GET /api/reports/donations` params: start_date, end_date, format (json/csv/pdf), scope (aggregate/per_donor), type (monthly/quarterly/annual)
- `GET /api/reports/giving_statement` params: donor_id, start_date, end_date → PDF only
- Frontend: report screen (date picker, type selector, scope toggle, download buttons), in-app table view
- All report queries: succeeded donations only (BL-46)
- Tests: report service unit tests, request specs for all report endpoints, PDF content spot-checks

**Out:**
- Email delivery of reports (not planned)
- Scheduled report generation (not planned)
- TICKET-106 admin deletion override (low priority, carries forward)

---

## Tickets

| Ticket | Scope | Status |
|---|---|---|
| New | Prawn setup + DonationReportPdf service (monthly report) | Not started |
| TICKET-103 | Monthly donation report: API + frontend | Not started |
| TICKET-104 | Quarterly donation report | Not started |
| TICKET-105 | Annual donation report | Not started |
| TICKET-133 | Individual donor giving statement PDF | Not started |
| New | Report tests: service unit + request specs | Not started |

---

## Quality requirements baked in

- Report queries use SQL aggregates (SUM/COUNT) — no N+1 loading of donation rows
- Prawn service is a plain Ruby object with no Rails dependencies (testable in isolation)
- PDF output verified for required columns per BL-45 and BL-50
