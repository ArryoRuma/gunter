# Gunter Web App (apps/web)

2D-first planning workspace for baseball complex layouts, with local persistence and a Babylon.js preview.

## What Changed

The plan editor now uses a command-based state store with full undo/redo coverage for plan edits.

Included in this implementation:
- Global undo/redo history for plan edits (parcel, calibration, asset placement and transforms)
- Always-visible undo/redo controls in the header
- Keyboard shortcuts for core editing actions
- Multi-select asset editing (basic additive selection with Shift)
- Drag-marquee selection in Move/Select mode
- Group operations: rotate, duplicate, delete
- On-canvas rotation handle for selected assets
- Optional grid snapping for place, move, and nudge operations
- Warning-based conflict policy during editing
- Readiness gate: preview/export blocked until conflicts are resolved
- Conflict quick-actions to select problematic assets directly from readiness panel
- Redesigned workspace layout and control hierarchy

## Run

From repo root:

```bash
pnpm dev
```

Directly for this package:

```bash
pnpm -C apps/web dev
```

## Validation Commands

```bash
pnpm -C apps/web lint
pnpm -C apps/web test
pnpm -C apps/web build
```

## Keyboard Shortcuts

- Undo: `Cmd/Ctrl + Z`
- Redo: `Shift + Cmd/Ctrl + Z`
- Duplicate selected: `Cmd/Ctrl + D`
- Delete selected: `Delete` / `Backspace`
- Fine rotate selected: `Alt + Left` / `Alt + Right`
- Nudge selected by 2 canvas units: `Arrow keys`
- Nudge selected by 10 canvas units: `Shift + Arrow keys`
- Toggle grid snapping: `G`

## Plan Workflow

1. Draw parcel points in `Draw Parcel` mode.
2. Calibrate scale in `Calibrate` mode with two points + real-world distance.
3. Place assets in `Place Asset` mode.
4. Use `Move/Select` mode to select and transform assets.
	- Click to select an asset.
	- Shift+click to add/remove asset from selection.
	- Drag on empty canvas to marquee-select multiple assets.
	- Drag selected assets to move as a group.
	- Drag a rotate handle while holding Shift to snap in 15° increments.
	- Enable grid snapping to align placement and movement on consistent increments.
5. Resolve readiness conflicts listed in the sidebar.
	- Use `Select` on each conflict to jump directly to implicated assets.
6. Open 3D preview or export JSON after readiness is clear.

## State and History

- Store implementation: `src/editorStore.ts`
- Asset catalog: `src/assets.ts`
- Main editor UI: `src/App.tsx`
- Geometry helpers: `src/geometry.ts`
- Store tests: `src/editorStore.test.ts`

History is maintained in-memory as command entries with do/undo behavior. Redo is cleared when a new forward edit is committed.

## Notes

- This package keeps local-first behavior by saving project state to localStorage.
- Import/export remains JSON-based.
- Conflict warnings do not block editing, only readiness actions (preview/export).
