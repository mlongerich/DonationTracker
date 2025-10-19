# Development Roadmap

*Thin vertical slice implementation plan*

---

## Completed Slices ✅

### Slice 1: Basic Donor Management (Complete)
- ✅ Donor model with validations
- ✅ CRUD API endpoints
- ✅ DonorForm and DonorList components
- ✅ Search, pagination, soft delete
- ✅ Donor merge with field selection
- ✅ CSV import via rake task

### Slice 2: Simple Donation Entry (Complete)
- ✅ Donation model with validation
- ✅ Donation API endpoints
- ✅ DonationForm with donor autocomplete
- ✅ DonationList with pagination
- ✅ Date range filtering

### Slice 5: Project-Based Donations (Complete)
- ✅ Project model with types (general/campaign/sponsorship)
- ✅ Project CRUD API
- ✅ ProjectsPage with full CRUD UI
- ✅ Project selection in donations
- ✅ React Router integration

---

## Current Work 🔵

### TICKET-010: Children & Basic Sponsorship (In Progress)
**Goal:** Track child sponsorships with project linkage

**Tasks:**
- [ ] Child model (name, age, photo_url, bio, location)
- [ ] Sponsorship model (donor + child + project linkage)
- [ ] Create Project when sponsorship is created
- [ ] Child CRUD API endpoints
- [ ] Sponsorship API endpoints
- [ ] ChildCard component with photos
- [ ] SponsorshipManager UI
- [ ] Link children to donors
- [ ] Show child info in donations view

**Estimated:** 2-3 weeks

---

## Planned Slices 📋

### Slice 3: Donor Dashboard & Enhanced Search
**Goal:** Advanced donor management features

- Donor statistics and giving history
- Advanced search with multiple filters
- Export donor lists
- Bulk operations

**Estimated:** 1-2 weeks

### Slice 4: Basic Authentication
**Goal:** Secure access with Google OAuth

- User model with roles
- Google OAuth integration
- Protected routes in frontend
- Role-based access control
- Authentication middleware

**Estimated:** 1-2 weeks

### Slice 6: Recurring Donations & Missed Payments
**Goal:** Automate sponsorship tracking

- Recurring donation fields
- Expected payment dates
- Automated missed payment detection
- Email notifications
- Admin dashboard for overdue payments

**Estimated:** 2-3 weeks

### Slice 7: Stripe Integration
**Goal:** Process online donations

- Stripe checkout integration
- Webhook handlers
- Payment intent tracking
- Refund handling
- Donation receipts

**Estimated:** 2-3 weeks

### Slice 8: Reporting & Analytics
**Goal:** Financial insights and donor analytics

- Monthly/annual donation reports
- Donor giving history
- Sponsorship status reports
- Export to CSV/PDF
- Dashboard visualizations

**Estimated:** 2-3 weeks

---

## Future Enhancements (Post-MVP)

- **Email Campaigns:** Bulk email to donors
- **Donor Portal:** Self-service donor access
- **Mobile App:** React Native mobile client
- **Advanced Analytics:** Charts, graphs, trends
- **Automated Receipts:** Tax-deductible donation receipts
- **Multi-currency:** Support multiple currencies
- **SMS Notifications:** Twilio integration

---

## Slice Selection Criteria

**High Priority (Do Next):**
- Provides immediate business value
- Has minimal external dependencies
- Can be completed in 1-3 weeks
- Builds on previous slices
- Validates core assumptions

**Low Priority (Defer):**
- Nice-to-have features
- Complex with many dependencies
- Can be worked around manually
- Low user impact

---

## Timeline Estimate

**MVP (6 Slices):** 10-14 weeks
**Full Feature Set:** 16-20 weeks
**Production Launch:** 20-24 weeks (including deployment, testing, training)

---

## Related Documentation

- **[Active Tickets](../../tickets/README.md)** - Current work items
- **[Data Models](data-models.md)** - Database schema
- **[API Endpoints](api-endpoints.md)** - API reference
