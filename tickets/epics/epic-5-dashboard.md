---
updated: 2026-06-24
---

# Epic 5 – Dashboard and User Preferences

**Goal:** Replace the Donations list as the application landing page with a configurable dashboard showing live stats and 12-month charts. Each widget is individually toggleable per user and the preference persists across sessions.

**Demo signal:** Admin logs in, sees the dashboard with six stat widgets and two charts. Toggles off the "total donated this year" widget. Logs out and back in — the widget is still hidden.

**Status:** Not started. Can begin after Epic 2 (sponsorship data is complete) but does not depend on Epics 3 or 4.

---

## Scope

**In:**
- Schema migration: add `preferences` (jsonb, default {}) to users table
- `GET /api/dashboard/stats` – single endpoint returning all six stat values (BL-57)
- `GET /api/dashboard/chart` – returns 12-month monthly data: count of succeeded donations + net amount per month
- `PATCH /api/users/preferences` – update current user's dashboard widget preferences
- Frontend: Dashboard screen at `/`, six stat widgets, two chart components (Recharts or similar), widget toggle controls, preference persistence via PATCH on toggle
- Default route changed from `/donations` to `/`
- Tests: stat calculations (all edge cases), preferences persistence, chart data query

**Out:**
- Donor-specific dashboard views (admin-only for now)
- Real-time push updates (polling or static on page load is sufficient)

---

## Tickets

| Ticket | Scope | Status |
|---|---|---|
| New | Schema migration: users.preferences jsonb | Not started |
| New | Dashboard stats API endpoint + chart endpoint | Not started |
| New | User preferences API endpoint | Not started |
| New | Frontend: stat widget components with toggle | Not started |
| New | Frontend: 12-month chart components | Not started |
| New | Frontend: preference persistence (PATCH on toggle) | Not started |
| New | Dashboard tests: stat calculations + preferences | Not started |

---

## Quality requirements baked in

- Both chart datasets returned in a single query (one GROUP BY month query, not two)
- Stat endpoint returns all six values in one DB round-trip where possible
- Widget toggle fires PATCH immediately on change (no save button)
- All stat calculations tested with edge cases (zero donations, all children sponsored, etc.)
