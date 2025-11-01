# API Endpoints Reference

*Complete REST API specification*

---

## Base URL

- **Development:** `http://localhost:3001/api`
- **E2E Tests:** `http://localhost:3002/api`
- **Production:** TBD

---

## Authentication (Planned)

```
POST   /auth/google_oauth2   # OAuth callback
DELETE /auth/logout           # Sign out
```

---

## Donors

### List Donors
```
GET /api/donors

Query Parameters:
  ?page=1                      # Pagination (default: 1)
  ?per_page=25                 # Results per page (default: 25)
  ?include_discarded=true      # Include archived donors
  ?q[name_or_email_cont]=john  # Ransack search

Response:
{
  "donors": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "discarded_at": null
    }
  ],
  "meta": {
    "total_count": 100,
    "total_pages": 4,
    "current_page": 1,
    "per_page": 25
  }
}
```

### Create Donor
```
POST /api/donors

Body:
{
  "donor": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}

Response: 201 Created (new) or 200 OK (existing)
```

### Get Single Donor
```
GET /api/donors/:id
```

### Update Donor
```
PATCH /api/donors/:id

Body:
{
  "donor": {
    "name": "Jane Doe"
  }
}
```

### Archive Donor
```
DELETE /api/donors/:id  # Soft delete
```

### Restore Donor
```
POST /api/donors/:id/restore
```

### Merge Donors
```
POST /api/donors/merge

Body:
{
  "donor_ids": [1, 2, 3],
  "field_selections": {
    "name": 1,    # Use name from donor ID 1
    "email": 2    # Use email from donor ID 2
  }
}

Response:
{
  "merged_donor": { ... },
  "merged_count": 3
}
```

---

## Donations

### List Donations
```
GET /api/donations

Query Parameters:
  ?page=1
  ?per_page=25
  ?q[date_gteq]=2025-01-01       # Date range start
  ?q[date_lteq]=2025-12-31       # Date range end
  ?q[donor_id_eq]=1              # Filter by donor

Response:
{
  "donations": [
    {
      "id": 1,
      "amount": "100.00",
      "date": "2025-10-15",
      "donor_id": 1,
      "donor_name": "John Doe",
      "project_id": 2,
      "project_title": "School Building"
    }
  ],
  "meta": { ... }
}
```

### Create Donation
```
POST /api/donations

Body:
{
  "donation": {
    "amount": 100.00,
    "date": "2025-10-15",
    "donor_id": 1,
    "project_id": 2
  }
}
```

### Get Single Donation
```
GET /api/donations/:id
```

---

## Projects

### List Projects
```
GET /api/projects

Response:
{
  "projects": [
    {
      "id": 1,
      "title": "General Donation",
      "project_type": "general",
      "system": true
    }
  ],
  "meta": { ... }
}
```

### Create Project
```
POST /api/projects

Body:
{
  "project": {
    "title": "School Building",
    "description": "New classroom construction",
    "project_type": "campaign"
  }
}
```

### Update Project
```
PUT /api/projects/:id

Body:
{
  "project": {
    "title": "Updated Title"
  }
}
```

### Delete Project
```
DELETE /api/projects/:id

Note: System projects cannot be deleted
```

---

## Planned Endpoints

### Children (TICKET-010)
```
GET    /api/children               # List all children
POST   /api/children               # Create child (admin only)
GET    /api/children/:id           # Get single child
PUT    /api/children/:id           # Update child (admin only)
GET    /api/children/:id/sponsors  # List child's sponsors
```

### Sponsorships (TICKET-010)
```
GET    /api/sponsorships                  # List all sponsorships
POST   /api/sponsorships                  # Create sponsorship (admin only)
GET    /api/donors/:id/sponsorships       # List donor's sponsored children
DELETE /api/sponsorships/:id              # End sponsorship (admin only)
```

### Reports (Future)
```
GET /api/reports/monthly/:year/:month  # Monthly donation summary
GET /api/reports/annual/:year          # Annual report
GET /api/reports/donor/:id             # Donor giving history
GET /api/donations/overdue             # Overdue sponsorships
```

### Webhooks (TICKET-026)
```
POST /webhooks/stripe  # Stripe payment webhook (real-time sync)

Supported Events:
  - charge.succeeded              # One-time donations
  - invoice.payment_succeeded     # Recurring subscription payments
  - customer.subscription.deleted # Subscription cancellations

Security:
  - Webhook signature verification via Stripe-Signature header
  - Returns 400 for invalid signatures
  - Returns 200 for successful processing

Note: Reuses StripePaymentImportService from TICKET-070 (zero code duplication)
```

---

## Error Responses

```json
{
  "error": "Validation failed",
  "errors": ["Email has already been taken"]
}
```

**Status Codes:**
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation failed
- `500 Internal Server Error` - Server error

---

## Related Documentation

- **[Data Models](data-models.md)** - Database schema
- **[Tech Stack](tech-stack.md)** - API framework details
