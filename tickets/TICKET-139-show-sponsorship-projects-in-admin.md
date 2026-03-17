## [TICKET-139] Show Sponsorship Projects in Admin Projects Tab

**Status:** 🔵 In Progress
**Priority:** 🟢 Low

### User Story

As an admin, I want to see sponsorship projects in the Admin Projects tab so that I can view and manage them, while still preventing sponsorship type from being selectable in the project create form.

### Background

TICKET-123 hid sponsorship projects from the create form dropdown (correct — backend rejects direct donations to sponsorship projects). However, sponsorship projects should still be visible in the Admin Projects tab so admins can see and manage them.

### Acceptance Criteria

- [ ] Sponsorship projects appear in the Admin Projects tab list
- [ ] Sponsorship type remains absent from the project create form dropdown
- [ ] Existing sponsorship project edit view still shows type as disabled ("Sponsorship - system managed")
