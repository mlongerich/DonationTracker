---
tags: [project, design, ui]
created: {{date}}
updated: 2026-06-08
author: claude
---

# {{Project Name}} – Design Guide

Patterns and conventions for the UI. Read before writing any frontend code. Update when a new interaction pattern is established – a pattern used in two or more places must be documented here before the epic closes.

---

## Philosophy

- **In-place edits.** Prefer editing fields inline over navigating to a separate edit page.
- **Optimistic UI.** Change UI state immediately on user action. If the server returns an error, restore the prior state and show an error message.
- **Per-field saves.** Each field saves independently. No "Save all" buttons.
- **Mobile-first.** Design for the smallest viewport first, then enhance for larger screens.
- **Touch targets.** Minimum 44x44px on all interactive elements.

---

## Design tokens

{{Fill in your token names and values, or reference your CSS variables file.}}

Core tokens (adapt to project):

```css
:root {
    --accent:       {{color}};
    --accent-ink:   {{color}};
    --ink-1:        {{color}};   /* primary text */
    --ink-2:        {{color}};   /* secondary text */
    --ink-3:        {{color}};   /* tertiary text */
    --ink-4:        {{color}};   /* placeholder / hint */
    --surface:      {{color}};   /* page background */
    --card:         {{color}};   /* card background */
    --line:         {{color}};   /* dividers, borders */
    --good:         {{color}};   /* success */
    --bad:          {{color}};   /* error */
    --warn:         {{color}};   /* warning */
    --good-soft:    {{color}};
    --bad-soft:     {{color}};
    --warn-soft:    {{color}};
}
```

---

## Component contract

Every UI component follows this interface:

```javascript
class MyComponent {
    constructor(container, data, api) { ... }
    render() { ... }              // sets innerHTML on container
    update(data) { ... }          // called when data changes
    #template() { ... }           // returns HTML string
    #attachEvents() { ... }       // called after render
    static #injectStyles() { ... } // injects CSS once
    static #stylesInjected = false;
}
```

- `constructor` receives container element, initial data, and api object.
- `render()` is the only place `innerHTML` is set on the container.
- Updates go through `update(data)` then `render()`, never direct DOM mutation.
- CSS is injected exactly once via the `#stylesInjected` guard.
- All selectors scoped to `[data-component="kebab-name"]` to prevent global collisions.

---

## Navigation

{{Describe your navigation structure here. Example: top nav tabs, sub-nav strips, hash routing.}}

---

## Forms

{{Describe your form interaction patterns. Example: validation rules, submit behaviour, error display.}}

### Validation

- Validate inline per field on blur, not on submit.
- Show error message below the field in `--bad` color.
- Show a summary at the top of the form if multiple fields are invalid.

### Submit behaviour

Optimistic: close form on submit, update list. If server returns error, reopen form with previous values and error at top.

---

## Empty states

| View | Empty state text |
|------|-----------------|
| {{view name}} | "{{empty state message}}" |

Empty state text: 12.5px italic, `--ink-4`.

---

## Error and loading states

**Loading:** Skeleton placeholder rows (CSS animation, `--line` color) shown while fetch is in flight. No spinner.

**Fetch error:** Inline error banner at top of the affected view with a "Retry" link. `--bad-soft` background.

**Form validation error:** Red border on invalid field (`--bad`), inline message below field.

---

## Accessibility

- All form inputs have visible `<label>` elements (not placeholder-only).
- Focus ring: `outline: 2px solid var(--accent); outline-offset: 2px` on `:focus-visible`.
- ARIA roles on modals: `role="dialog"`, `aria-modal="true"`, focus trapped inside.
- Color is never the only signal for status or direction.
