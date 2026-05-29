# GitHub Actions CI

Use this skill when creating or improving CI workflows in GitHub Actions.

## Procedure

1. Identify workflow trigger events and required jobs.
2. Define job dependencies, execution order, and parallelism.
3. Apply least-privilege permissions and secure secret handling.
4. Pin actions and standardize runtime versions.
5. Add validation steps for lint, typecheck, tests, and build as appropriate.
6. Define failure handling, artifact strategy, and reporting.
7. Run or recommend workflow validation before merging.

## Workflow Specification Mode

When asked to formalize an existing workflow, produce a compact behavior specification that is implementation-agnostic and AI-maintainable.

Include:

1. Workflow purpose and trigger events.
2. Job dependency graph.
3. Requirements matrix (functional, security, performance).
4. Input/output contracts and secrets/variables.
5. Constraints (timeouts, concurrency, permissions) and error handling.
6. Quality gates, observability, and change-management notes.

## Output

- Workflow goal
- Jobs and dependencies
- Security controls
- Validation gates
- Known risks and follow-ups
- Specification sections, when workflow-spec mode is requested
