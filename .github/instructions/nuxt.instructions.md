---
description: "Nuxt-specific implementation rules for app structure, server routes, composables, and runtime config safety."
applyTo: "**/*.vue, **/*.ts, **/*.js, **/*.css"
---

# Nuxt Instructions

- Use Nuxt conventions.
- Prefer the existing app structure.
- Use `server/api` for server routes when appropriate.
- Use composables for shared client logic.
- Use Nitro/server utilities for backend concerns.
- Avoid client-only code unless necessary.
- Keep runtime config usage explicit.
- Do not expose private environment variables to the client.
- Add loading, empty, and error states for async data.
- Keep business logic out of templates where practical.
