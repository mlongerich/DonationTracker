---
author: claude
created: 2026-06-24
updated: 2026-06-24
tags: [project, process, design, frontend]
---

# Donation Tracker – Design Guide

Living document. Documents the UI stack, layout system, component patterns, and interaction conventions derived from existing code. Update when a new pattern is established or an existing one changes. Read this before writing any new UI code.

---

## Philosophy

**In-place edits.** Edit fields inline on the list page. Do not navigate to a separate edit page. The card gets active edit styling while the form is open.

**Non-optimistic UI.** Wait for the API response before updating the UI. On success show a success Snackbar and reset the form. On error keep the form open and show an error Snackbar. Do not update local state before the server confirms.

**Full form submits.** Fields are not saved individually. The whole form submits as one operation. No "Save field" buttons per input.

**Mobile-first.** Design for xs (0px) first. Enhance for sm (600px) if needed. The page container is `maxWidth="sm"` which keeps layouts simple across all sizes.

**Touch targets.** Interactive elements should meet minimum touch target size. MUI `IconButton` size="small" renders at 34px by default, which is below the 44px WCAG recommendation. Compensate with `sx={{ p: 1 }}` on touch-primary actions if needed.

---

## Stack

| Library | Version | Purpose |
|---|---|---|
| MUI Material | v7 | Component library, theming |
| MUI X Date Pickers | v8 | Date inputs |
| MUI X Data Grid | v8 | Tabular data (admin views) |
| MUI Icons Material | v7 | Icon set |
| React | v19 | UI framework |
| React Router DOM | v6 | Client-side routing |
| Axios | v1 | HTTP client |
| Recharts | (planned Epic 5) | Charts for dashboard |

Theme file: `src/theme.ts`. Custom breakpoints only. No custom palette or typography overrides yet. All colors use MUI default theme tokens.

---

## Layout system

### Page container

Every page renders inside `Layout.tsx` which wraps content in:

```tsx
<Container maxWidth="sm">
  <Box sx={{ my: 4 }}>
    <Outlet />
  </Box>
</Container>
```

`maxWidth="sm"` (600px) is the content width for all pages. Do not widen individual pages outside this container. If a page genuinely needs more width (e.g. a data grid), open a discussion before changing it.

### Navigation

`AppBar` with `position="static"`. App name as `Typography variant="h6"` with `flexGrow: 1`. Nav links as `Button color="inherit"` using React Router `component={RouterLink}`.

Current nav items: Donations, Donors, Children, Sponsorships, Reports, Admin, Logout.

Dashboard (Epic 5) will become the default route. The nav will be updated then.

### Breakpoints

| Token | Value |
|---|---|
| xs | 0px |
| sm | 600px |
| md | 960px |
| lg | 1280px |
| xl | 1920px |

Mobile-first. All components must work at xs. Use `sm` breakpoints for layout shifts if needed.

---

## Typography

Use MUI typography variants consistently. Do not use custom font sizes via `sx={{ fontSize: ... }}`.

| Variant | Use |
|---|---|
| `h6` | App bar title |
| `h5` | Page headings |
| `subtitle1` | Card primary line (name, amount) |
| `body2` | Card secondary lines (email, date, secondary info) |
| `body2 color="text.secondary"` | Secondary info that exists |
| `body2 color="text.disabled"` | Placeholder for missing optional info (e.g. "No phone") |

---

## Spacing

MUI spacing unit is 8px. All spacing uses theme multipliers via `sx` props.

| Value | px | Common use |
|---|---|---|
| 0.5 | 4px | Tight icon button gaps |
| 1 | 8px | Inner content spacing |
| 2 | 16px | Stack spacing between cards, between form fields |
| 4 | 32px | Page vertical padding (`my: 4`), empty state vertical padding (`py: 4`) |

Form fields: `Stack spacing={2}`.
Card stacks: `Stack spacing={2}`.
Page top margin: `Box sx={{ my: 4 }}` (already applied by Layout).

---

## Color system

No custom palette. Use MUI semantic color tokens only.

| Token | Use |
|---|---|
| `primary` | Submit buttons, active edit border |
| `error` | Cancel buttons (edit mode), failed status chips, destructive actions |
| `warning` | Needs attention status |
| `success` | Succeeded/active status |
| `info` | Pending status |
| `default` | Neutral chips (Archived, payment method) |
| `text.secondary` | Secondary info, empty state text |
| `text.disabled` | Missing optional field placeholders |
| `action.hover` | Active edit card background |
| `grey[500]` | Dialog close button |

### Status chip color mapping

```typescript
const getStatusColor = (status: string): 'error' | 'warning' | 'success' | 'info' | 'default' => {
  switch (status) {
    case 'failed':     return 'error';
    case 'pending':    return 'info';
    case 'succeeded':  return 'success';
    default:           return 'default';
  }
};
```

---

## Form components

### Input sizing

All form inputs use `size="small"` (40px height). Applies to TextField, Autocomplete, DatePicker, Select. Never use the default (56px) size.

### Submit and cancel buttons

```
Submit:  variant="contained" color="primary" fullWidth
Cancel:  variant="outlined"  color="error"   fullWidth
```

Cancel appears only in edit mode for inline page forms. Create mode has no cancel. Dialogs have no cancel (the X button closes them).

### Address layout

City / State / Zip on one row using flex:

```tsx
<Box sx={{ display: 'flex', gap: 2 }}>
  <TextField label="City"            size="small" sx={{ flex: 2 }} />
  <TextField label="State/Province"  size="small" sx={{ flex: 1 }} />
  <TextField label="Zip/Postal Code" size="small" sx={{ flex: 1 }} />
</Box>
```

---

## List components

### Card structure

All list items use `Card variant="outlined"` inside `Stack spacing={2}`.

```tsx
<Stack spacing={2}>
  {items.map(item => (
    <Card key={item.id} variant="outlined">
      <CardContent>
        ...
      </CardContent>
    </Card>
  ))}
</Stack>
```

### Active edit state

When a card is in edit mode, highlight it:

```tsx
sx={{
  borderColor: isEditing ? 'primary.main' : undefined,
  borderWidth: isEditing ? 2 : 1,
  backgroundColor: isEditing ? 'action.hover' : undefined,
}}
```

### Archived state

Reduce opacity on archived/discarded records:

```tsx
sx={{ opacity: isArchived ? 0.6 : 1 }}
```

### Empty state

```tsx
<Box sx={{ textAlign: 'center', py: 4 }}>
  <Typography color="text.secondary">No donors yet</Typography>
</Box>
```

---

## Action buttons

Actions on cards use `IconButton size="small"` wrapped in `Tooltip`.

```tsx
<Tooltip title="Edit donor">
  <IconButton aria-label="edit" size="small" onClick={() => onEdit?.(item)}>
    <EditIcon />
  </IconButton>
</Tooltip>
```

Always include `aria-label` for accessibility. Group action buttons in `Box sx={{ display: 'flex', gap: 0.5 }}`.

Icon conventions:
- Edit: `EditIcon`
- Archive / soft delete: `ArchiveIcon`
- Restore: `UnarchiveIcon`
- Add: `AddIcon`
- Close dialog: `CloseIcon`
- Girl gender: `Girl` (MUI icon)
- Boy gender: `Boy` (MUI icon)

---

## Dialogs

Use `StandardDialog` for all modal dialogs. Do not use `Dialog` directly.

```tsx
<StandardDialog
  open={open}
  onClose={handleClose}
  title="Add Sponsorship"
  error={error}
  onErrorClose={() => setError(null)}
  maxWidth="sm"
>
  <SponsorshipForm onSubmit={handleSubmit} />
</StandardDialog>
```

`maxWidth` defaults to `"sm"`. The dialog renders a close X button in the top right. Error messages surface via the integrated Snackbar using the `error` prop. No cancel button inside the dialog content.

---

## Chips and badges

Use `Chip size="small"` for all status badges and type labels.

```tsx
<Chip label="Archived" size="small" color="default" />
<Chip label="Failed"   size="small" color="error" />
<Chip label="Child"    size="small" />
```

Type badges in autocomplete options (child vs project) use Chip with grouped sections.

---

## Autocomplete with grouped options

When an autocomplete shows multiple entity types (children and projects together), group results and show type badges:

```tsx
<Autocomplete
  groupBy={(option) => option.type === 'project' ? 'Projects' : 'Children'}
  renderOption={(props, option) => (
    <li {...props}>
      <Chip label={option.type === 'child' ? 'Child' : option.project_type} size="small" />
      {option.type === 'child' && (option.gender === 'girl' ? <Girl /> : <Boy />)}
      {option.name}
    </li>
  )}
/>
```

---

## Loading states

**Autocomplete inputs:** Show `CircularProgress size={20}` as an end adornment while the search request is in flight.

```tsx
endAdornment: (
  <>
    {loading ? <CircularProgress color="inherit" size={20} /> : null}
    {params.InputProps.endAdornment}
  </>
)
```

**List pages:** No skeleton or spinner. Pages render empty content until data loads. Add a loading skeleton pattern when the page load latency becomes noticeable (post-MVP).

---

## Error and success notifications

Page-level errors and success confirmations use `Snackbar` + `Alert` anchored at `bottom/center` with `autoHideDuration={6000}`.

```tsx
<Snackbar
  open={!!error}
  autoHideDuration={6000}
  onClose={() => setError(null)}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
>
  <Alert severity="error" onClose={() => setError(null)}>
    {error}
  </Alert>
</Snackbar>

<Snackbar
  open={!!successMessage}
  autoHideDuration={6000}
  onClose={() => setSuccessMessage(null)}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
  data-testid="success-snackbar"
>
  <Alert severity="success" onClose={() => setSuccessMessage(null)}>
    {successMessage}
  </Alert>
</Snackbar>
```

**Dialog errors:** Use `StandardDialog`'s built-in `error` prop, which renders its own Snackbar. Do not add a separate Snackbar inside a dialog.

**API error parsing:** Extract the message from the backend response in this priority order:

```typescript
const errorMessage =
  err.response?.data?.error ||
  err.response?.data?.errors?.[0] ||
  'Failed to [action]';
```

---

## Form validation and submit behavior

**Validation timing:** Validate on submit, not on blur. HTML5 type validation (e.g. `type="email"`) handles basic format checks. Backend validation errors surface via Snackbar after submit.

**Submit flow:**
1. User submits form
2. Await API response (no optimistic update)
3. On success: reset form state, show success Snackbar, close dialog or exit edit mode
4. On error: keep form open with current values, show error Snackbar

**Error message source:** Always parse from API response. Never show raw network errors to the user.

---

## Interaction conventions

### Quick create

When a user needs to create a related entity mid-workflow (e.g. create a donor while adding a donation), use a quick create dialog via `QuickEntityCreateDialog`. Do not navigate away from the current page.

### Inline edit

Edit happens inline on the list page. Clicking edit on a card expands the form below it (or replaces the card content). The card gets the active edit styling. A cancel button exits edit mode and restores the card display.

### Preference toggles (Epic 5)

Widget toggle fires `PATCH /api/users/preferences` immediately. No save button.

---

## Accessibility

- All `IconButton` components must have `aria-label`
- All form inputs must have `label` (not just placeholder)
- Use semantic HTML elements (`form`, `li`, etc.) where appropriate
- Target WCAG 2.1 AA
- MUI components handle focus management and keyboard navigation. Do not suppress this with `tabIndex="-1"` unless there is a specific documented reason.

---

## Planned additions (not yet in codebase)

| Item | Epic | Notes |
|---|---|---|
| Recharts integration | Epic 5 | 12-month bar and line charts for dashboard |
| Custom theme palette | Post-Epic 5 | Add brand colors once dashboard design is settled |
| Dashboard stat widgets | Epic 5 | New component pattern, document when built |
| Read-only field styling | Epic 1 | Visual treatment for locked Stripe-sourced fields |
