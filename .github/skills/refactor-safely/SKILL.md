# Refactor Safely

Use this skill when improving code structure without changing behavior.

## Procedure

1. Review applicable standards in .github/instructions and .github/copilot-instructions.md.
2. Define the behavior that must remain unchanged.
3. Identify public APIs and contracts.
4. Make small mechanical changes first.
5. Avoid mixing refactor and feature work.
6. Preserve tests or add characterization tests.
7. Run validation commands.
8. Summarize behavior-preservation evidence.

## Guardrails

- Prefer incremental, in-place updates over broad file reshaping unless explicitly requested.
- Pause refactoring when there is no test safety net for critical production paths.
- Do not refactor solely for style during urgent delivery windows.

## Safe Refactor Targets

- Long methods and large classes.
- Duplicated logic and magic values.
- Excessive parameter lists and primitive obsession.
- Naming clarity and small extract-method opportunities.

## Output

- Refactor goal
- Behavior preserved
- Files changed
- Validation
- Risks
- Standards reviewed
