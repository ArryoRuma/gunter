# Debug Build Failure

Use this skill when a local build, CI job, typecheck, lint, test, or deployment fails.

## Procedure

1. Capture the exact command that failed.
2. Capture the full error output.
3. Identify whether the failure is caused by dependencies, configuration, types, linting, tests, environment variables, or application code.
4. Inspect the smallest relevant set of files.
5. Propose the smallest safe fix.
6. Avoid rewriting unrelated files.
7. Run or recommend the validation command again.

## Output

- Failed command
- Likely root cause
- Files inspected
- Fix applied or recommended
- Validation result
- Remaining risks
