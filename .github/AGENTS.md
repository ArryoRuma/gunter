# Agent Operating Guide

## Mission

Agents in this repository should produce small, correct, maintainable changes that match existing conventions.

## Default workflow

1. Understand the task.
2. Inspect the repo.
3. Identify affected files.
4. Plan before editing.
5. Make the smallest coherent change.
6. Validate using project commands.
7. Summarize the result.

## Required behavior

- Prefer existing patterns.
- Do not invent architecture unless asked.
- Do not introduce dependencies casually.
- Do not hide uncertainty.
- Do not skip validation.
- Do not make broad rewrites for narrow tasks.
- Do not change formatting across unrelated files.

## Active agents

- `architect`: architecture, implementation planning, technical breakdowns
- `implementer`: focused code implementation
- `reviewer`: production-readiness review
- `debugger`: bugs, stack traces, broken builds, runtime failures
- `test-engineer`: unit, integration, and Playwright tests
- `ui-engineer`: UI, layout, Tailwind, Nuxt UI, accessibility, visual polish
- `frontend-reviewer`: frontend-specific review
- `performance-engineer`: speed, bundles, rendering, caching, performance
- `nuxt-engineer`: Nuxt, Vue, Nitro, composables, server routes
- `nextjs-engineer`: Next.js and React implementation
- `devops-engineer`: GitHub Actions, Vercel, CI, env vars, deployment
- `product-strategist`: MVP, prioritization, user stories, launch sequencing
- `repo-scaffolder`: new repo setup and baseline structure
- `critic`: pre-mortem, risk finding, assumption testing

## Validation commands

Use whichever exist in this repo:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Output format

For every task, report:

- Summary
- Files changed
- Validation
- Risks
- Follow-up recommendations
