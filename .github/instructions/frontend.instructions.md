---
description: "Frontend implementation standards for components, pages, layouts, and composables."
applyTo: "**/*.tsx, **/*.ts, **/*.jsx, **/*.js, **/*.vue, **/*.css"
---

# Frontend Instructions

Apply these instructions to frontend components, pages, layouts, and composables.

- Use existing design tokens and components first.
- Prefer composition over deeply nested conditionals.
- Keep components focused.
- Extract reusable logic into composables only after duplication appears.
- Accessibility is not optional.
- Every interactive control needs a clear label, state, and keyboard behavior.
- Use responsive layouts by default.
- Add loading, empty, and error states for data-driven UI.
- Avoid unnecessary client-only code.
- Avoid unnecessary dependencies.
