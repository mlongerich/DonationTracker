# Donation Tracker

Internal donation management system for Projects for Asia. Tracks donations, donor relationships, child sponsorships, and Stripe payment imports.

**Production:** https://donations.projectsforasia.com

---

## What it does

- Record donations (manual entry or Stripe CSV import)
- Manage donor records including merge, archive, and contact info
- Track sponsored children and their sponsorship lifecycle
- Admin tools for pending review queue, reports, and data exports
- Google OAuth login restricted to @projectsforasia.com accounts

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Ruby on Rails 8 API |
| Frontend | React 18 + TypeScript + Material UI |
| Database | PostgreSQL 15 |
| Auth | Google OAuth 2.0 + JWT |
| Infrastructure | Docker Compose on DigitalOcean |
| Payment data | Stripe CSV import |

## Project structure

```
donation_tracker_api/    Rails API backend
donation_tracker_frontend/   React frontend
docs/                    Project documentation
tickets/                 Work items organised by epic
workflow/                Development process templates and skills
scripts/                 Testing, deployment, and validation tools
deployment/              Production deployment configuration
```

## Quick start

See `docs/project/tech-stack.md` for ports, Docker setup, and development commands.

```bash
docker-compose up
```

Backend runs on port 3001. Frontend dev server on port 3000.

## Development

This project uses a six-stage gate development process. See `docs/development-process.md` for the full workflow.

Work items are tracked as tickets in `tickets/` and organised into epics in `tickets/epics/`. See `tickets/README.md` for the full index.

Testing: `bash scripts/test-backend.sh` for backend. `npm test` for frontend.

## Documentation

| Document | Purpose |
|---|---|
| `docs/business-logic.md` | Business rules, actor model, data model (Stage 1) |
| `docs/development-process.md` | Six-stage gate process and working agreements |
| `docs/PATTERNS.md` | Code patterns reference (controllers, services, hooks) |
| `docs/TESTING.md` | Test infrastructure and framework setup |
| `docs/ARCHITECTURE.md` | System diagrams and workflows |
| `docs/project/` | Data models, API endpoints, tech stack, roadmap |
| `CLAUDE.md` | Development conventions for Claude Code sessions |
