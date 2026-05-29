# Skills Governance Phase 2

## Scope

- Inventory coverage: every folder in [.github/skills](../../.github/skills) and [_archive/skills](../../_archive/skills).
- Total active skills scanned: 305.
- Total archived skills scanned: 24.

## Tiering outcome

- Core: 16
- Optional: 281
- Experimental: 8
- Archive-candidate: 24

## Action outcome

- Merge recommendations: 3
- Planned archive candidates (not moved in this pass): 0
- Full per-skill action matrix: [skills-action-matrix.tsv](skills-action-matrix.tsv)
- CSV export: [skills-action-matrix.csv](skills-action-matrix.csv)
- Categorized index: [skills-index-by-domain.md](skills-index-by-domain.md)

## Merge recommendations

1. create-github-action-workflow-specification -> github-actions-ci
2. review-and-refactor -> review-pull-request + refactor-safely
3. refactor -> refactor-safely
4. playwright-generate-test -> generate-tests (already archived and consolidated)

## Post-execution status

1. Strict archive policy has been executed: planned archive-candidate skills were moved to [_archive/skills](../../_archive/skills).
2. Merge-consolidation has been executed for overlapping skills:
	- create-github-action-workflow-specification -> github-actions-ci
	- review-and-refactor -> review-pull-request + refactor-safely
	- refactor -> refactor-safely
3. Archive traceability has been updated in [_archive/ARCHIVE_MANIFEST.md](../../_archive/ARCHIVE_MANIFEST.md).
4. Optional follow-up: keep the matrix as governance reference and revisit tiers as new skills are added.
