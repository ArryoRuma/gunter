# Repository Instructions for GitHub Copilot

## Project context

This repository uses modern TypeScript-first web development and GitHub Copilot-assisted workflows. Prefer simple, maintainable implementations over clever abstractions.

## Package manager

Use pnpm. Do not use npm or yarn unless explicitly requested.

Common commands:

- Install: `pnpm install`
- Dev: `pnpm dev`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
- Test: `pnpm test`

## Code standards

- Prefer TypeScript.
- Prefer explicit types at public boundaries.
- Keep functions small and focused.
- Avoid unnecessary abstraction.
- Do not introduce new dependencies without explaining why.
- Follow existing file and naming conventions.
- Update relevant docs when behavior changes.
- Add or update tests for meaningful logic changes.

## Frontend standards

- Prefer framework-native patterns.
- Use existing components before creating new ones.
- Ensure responsive layouts.
- Include loading, empty, and error states where relevant.
- Use semantic HTML and accessible labels.

## Agent behavior

Before making significant changes:

1. Inspect existing patterns.
2. Identify affected files.
3. Make the smallest coherent change.
4. Run or recommend validation commands.
5. Summarize what changed and why.

Do not rewrite large areas of the codebase unless the task explicitly requires it.
