# Donation Tracker - Project Specifications

*Technical requirements and system design for children's home donation management*

---

## 📖 Documentation

- **[Project Overview](docs/project/README.md)** - Status, architecture, quick start
- **[Data Models](docs/project/data-models.md)** - Database schema and relationships
- **[API Endpoints](docs/project/api-endpoints.md)** - Complete REST API reference
- **[Tech Stack](docs/project/tech-stack.md)** - Frameworks, tools, versions
- **[Development Roadmap](docs/project/roadmap.md)** - Vertical slice implementation plan
- **[Deployment Guide](docs/project/deployment.md)** - Production infrastructure

---

## 🚀 Project Status

**Last Updated:** 2025-11-01

**Latest Milestones:**
- TICKET-070/071/072/026 - Stripe Integration Planning (CSV Import + Webhooks) 📋 (2025-11-01)
- TICKET-065 - Move Business Logic to Backend (displayable_email) ✅ (2025-10-31)
- TICKET-064 - Smart Sponsorship Detection & Backend Logic ✅ (2025-10-31)
- TICKET-032 - Custom Hooks Library (useDebouncedValue, usePagination, useRansackFilters) ✅ (2025-10-29)
- TICKET-063 - Archive Business Logic for Active Sponsorships ✅ (2025-10-29)

**Current Focus:** Stripe CSV import implementation (TICKET-070 foundation → TICKET-071 batch import)
**Deferred Risk:** TICKET-049 (frontend protection sufficient, backend API risk accepted)

**See [docs/project/README.md](docs/project/README.md#current-status) for detailed status**

---

## 🎯 Quick Links

### For Developers
- [Active Tickets](tickets/README.md) - Current work items and backlog
- [Development Conventions](CLAUDE.md) - AI coding guidelines and TDD workflow
- [Setup Guide](CLAUDE.md#development-environment-setup) - Environment configuration

### For Project Planning
- [Feature Roadmap](docs/project/roadmap.md) - Implementation timeline
- [Data Models](docs/project/data-models.md) - Database design
- [API Reference](docs/project/api-endpoints.md) - Endpoint documentation

### For Deployment
- [Tech Stack](docs/project/tech-stack.md) - Infrastructure components
- [Deployment Guide](docs/project/deployment.md) - Production setup

---

## 📝 Project Vision

A secure web application to track donations for a children's home and school organization, managing:

- **General Donations** - One-time and recurring contributions
- **Project-Based Donations** - Campaign-specific fundraising
- **Child Sponsorship Program** - Monthly sponsorships with automated tracking
- **Missed Payment Detection** - Automated alerts for overdue payments

---

## 🏗️ Current Architecture

```
DonationTracker/
├── donation_tracker_api/       # Rails 8.0.2 API (port 3001)
├── donation_tracker_frontend/  # React 19 + TypeScript (port 3000)
├── docs/project/              # Modular project documentation
├── tickets/                   # Active work items
├── CLAUDE.md                  # AI development conventions
└── docker-compose.yml         # Service orchestration
```

See [docs/project/README.md](docs/project/README.md) for complete architecture details.

---

*For development workflow and conventions, see [CLAUDE.md](CLAUDE.md)*
