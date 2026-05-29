# Review Pull Request

Use this skill when reviewing a diff, branch, or PR.

## Preparation

1. Load applicable repository instructions from .github/instructions and .github/copilot-instructions.md.
2. Identify scope, acceptance criteria, and changed public contracts before reviewing details.
3. If refactoring is requested alongside review, apply findings-first review output, then execute behavior-preserving refactor steps from refactor-safely.

## Review checklist

- Correctness
- Type safety
- Security
- Accessibility
- Performance
- Maintainability
- Error handling
- Tests
- Documentation
- Acceptance criteria

## Output

Return findings in this order:

1. Blocking issues
2. Non-blocking improvements
3. Questions
4. Positive notes, only when specific and useful
