# Architecture

## Purpose

Gunter is a browser-based tool for designing baseball field complexes. Creators draw a real-scale parcel in a 2D plan, place stadium assets (fields, concessions, lighting, parking), preview the layout in 3D, author a guided camera tour, and export the full project as a portable JSON document.

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| UI framework | **React 18 + TypeScript** (strict) | Mature ecosystem; concurrent rendering; first-class TS |
| Build tooling | **Vite 5 + pnpm** | Sub-second HMR; ESM-native; workspace-ready |
| 3D rendering | **Babylon.js 7** (`@babylonjs/core`, `@babylonjs/loaders`) | First-class TS, built-in GLTF/GLB loader, arc-rotate & fly cameras — see [ADR 001](decisions/001-babylon-js-for-3d.md) |
| Local persistence | **Dexie 4** (IndexedDB wrapper) | Offline-first, typed generics, schema versioning — see [ADR 002](decisions/002-local-first-with-dexie.md) |
| Global state | **Zustand 5** | Minimal boilerplate; works outside React (scene sync); no Provider required |
| Undo / redo | **Command pattern** (custom) | O(1) memory per action; history UI ready — see [ADR 003](decisions/003-command-pattern-undo-redo.md) |
| Spatial indexing | **rbush 4** | R-tree collision detection for 2D asset placement |
| Styling | **Tailwind CSS v4** (via `@tailwindcss/vite`) | Utility-first; no PostCSS config needed; zero runtime CSS |

---

## App Structure

```
src/
├── main.tsx                  # React 18 createRoot entry point
├── index.css                 # @import "tailwindcss" — Tailwind v4 entry
├── App.tsx                   # Root shell: tab state + AppShell composition
│
├── types/
│   └── index.ts              # All domain types: Project, Parcel, PlacedAsset,
│                             #   TourStop, Transform, FieldPreset, AssetType, …
│
├── assets/
│   └── catalog.ts            # Built-in FIELD_PRESETS and ASSET_TYPES catalog
│
├── lib/
│   ├── db/
│   │   └── index.ts          # GunterDB (Dexie) — tables: projects, parcels,
│   │                         #   placedAssets, tourStops
│   ├── store/
│   │   └── index.ts          # Zustand store — UI state + project state +
│   │                         #   undoStack/redoStack + all actions
│   ├── commands/
│   │   └── index.ts          # Command interface + AddPlacedAsset,
│   │                         #   RemovePlacedAsset, MoveAsset commands
│   ├── collision/
│   │   └── index.ts          # rbush spatial index + getAABB + checkCollision
│   └── scale/
│       └── index.ts          # Scale calibration math (pixels ↔ feet/meters)
│
└── components/
    ├── layout/
    │   ├── AppShell.tsx      # Full-height flex wrapper (header + main)
    │   └── TabBar.tsx        # Horizontal tab navigation (Plan / 3D / Tour / Share)
    ├── plan/
    │   └── PlanTab.tsx       # Phase 1 — 2D plan editor (canvas placeholder)
    ├── preview/
    │   └── PreviewTab.tsx    # Phase 3 — Babylon.js scene (canvas ref placeholder)
    ├── tour/
    │   └── TourTab.tsx       # Phase 4 — tour stop list (placeholder)
    └── share/
        └── ShareTab.tsx      # Phase 5 — export/import JSON (stub buttons)
```

### Key conventions

- **`@/` path alias** maps to `src/` — configured in `tsconfig.app.json` and `vite.config.ts`.
- **No CSS modules, no inline styles** — Tailwind utility classes only.
- All imports use `import type` when importing only type-level constructs.

---

## Data Flow

```
Creator action (UI event)
        │
        ▼
  Instantiate Command
  (AddPlacedAssetCommand, MoveAssetCommand, …)
        │
        ▼
  store.executeCommand(cmd)      ← Zustand
        │
        ├─ cmd.do()              ← mutates store state (setPlacedAssets, etc.)
        │
        └─ pushes cmd → undoStack
                │
                ▼
        db.placedAssets.add/put()   ← Dexie (IndexedDB) — persists to disk
                │
                ▼
        Babylon.js scene sync   ← Phase 3: store.subscribe() drives scene graph
```

**Undo path:** `store.undo()` pops `undoStack`, calls `cmd.undo()`, which reverses the Dexie write and updates Zustand state.

**Export path (Phase 5):** `db.projects.get() + db.placedAssets.where({projectId}).toArray() + …` → serialised to `ProjectDocument` JSON → downloaded as `.gunter.json`.

---

## Key Decisions

Major architecture decisions are recorded as ADRs in [`docs/decisions/`](decisions/):

| # | Title | Status |
|---|-------|--------|
| [001](decisions/001-babylon-js-for-3d.md) | Use Babylon.js for 3D Rendering | Accepted |
| [002](decisions/002-local-first-with-dexie.md) | Local-First Persistence with Dexie | Accepted |
| [003](decisions/003-command-pattern-undo-redo.md) | Command Pattern for Undo/Redo | Accepted |

---

## Validation

Run these commands to verify the scaffold before starting Phase 1:

```bash
pnpm install          # install all dependencies
pnpm typecheck        # tsc --noEmit — must pass with zero errors
pnpm build            # tsc -b && vite build — must produce dist/
pnpm dev              # dev server — verify the 4-tab UI renders
```

