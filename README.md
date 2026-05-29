# 3D Visualizer — Product Brief
## One-liner

A **web-based 3D architecture visualizer/renderer** that lets creators quickly sketch a site, drop in buildings/landscape assets, and produce **investor-ready 3D visualizations**—starting with **baseball field complexes**.

## Primary user

A web developer / architect / creative builder who wants to visualize a capital project to attract a principal and other investors.

## Primary stakeholders

- Creator (editor)
- Principal / lead investor (viewer)
- Other investors (viewer)
- City planners / town councils (viewer)

## Success criteria

A creator can:

1) Draw a parcel outline in real-world scale

2) Place 3–4 fields + key complex assets

3) Generate a guided-tour experience and share via interactive link

## Assumptions

- Web-first
- Speed + clarity over CAD-level precision (MVP)
- Built-in asset library for realism (MVP)

## Open questions

- Final field preset catalog beyond 180’/220’
- Export expectations before publish backend exists (JSON export + optional screenshot)
- Embed constraints (fullscreen, iframe pointer lock behavior)


# MVP Scope — 3D Baseball Complex Visualizer
## In scope (MVP)

- Single-user creator (no multi-account)
- 2D plan editor:
    - Parcel polygon draw + edit
    - Scale calibration
    - Place/move/rotate/delete assets
    - No-overlap constraints
    - Measurement overlays
- Built-in asset library (no model import)
    - Baseball field asset + presets (incl. 180’ and 220’)
    - Turf infield / grass outfield toggle
    - Concessions, parking modules, batting cages, seating, lighting
- 3D Preview (Babylon.js)
    - Parity with 2D placement
    - Environment presets
- Guided tour authoring (5–10 stops typical)
- Viewer experience:
    - Play tour / Skip tour
    - View-only
- Local-first persistence (IndexedDB) + export/import project JSON

## Out of scope (explicitly deferred)

- Multi-user collaboration
- AI parcel tracing
- Photoreal offline rendering
- GLB import (Phase 2)
- GIS / true north
- Layer toggles for viewers


# Build Plan — Phases & Milestones
## Phase 0 — Foundations

- Single-page app shell (tabs)
- Project state model
- IndexedDB persistence (Dexie)
- Export/import `project.json`

## Phase 1 — 2D Plan Editor

- Parcel polygon draw/edit
- Scale calibration
- Asset placement primitives
- Measurement overlays
- No-overlap constraints (OBB footprints + rbush recommended)

## Phase 2 — Asset Library v1

- Asset catalog + loader
- GLB pipeline + optimization budgets
- Required assets (fields + complex pack)

## Phase 3 — 3D Preview (Babylon.js)

- Scene setup + lighting presets
- 2D ↔ 3D parity
- Performance pass

## Phase 4 — Tour

- Capture tour stops
- Reorder/edit
- Playback

## Phase 5 — Sharing

- MVP: export/share project JSON
- Next: minimal publish backend returning tokenized link



# Data Model — Entities & Fields
## Entities

### Project

- id
- title
- units (feet/meters)
- createdAt, updatedAt

### Parcel

- id
- projectId
- polygon: Point[]
- scaleCalibration:
    - calibrationLine: [Point, Point]
    - realWorldLength
    - unit

### AssetType (library)

- id
- category
- name
- modelRef
- thumbnailRef

### FieldPreset

- id
- name
- fenceDistanceFt
- optional dims (base paths, etc.)

### PlacedAsset (instance)

- id
- projectId
- assetTypeId
- position (x,y,z)
- rotationYaw
- scale (x,y,z)
- label?
- fieldConfig?:
    - fieldPresetId
    - surfaceInfield (turf/grass)
    - surfaceOutfield (grass/turf)

### TourStop

- id
- projectId
- orderIndex
- title?
- cameraPosition
- cameraTarget
- fov?

## Notes

- Persist as a single local-first JSON document per project (plus a library version).

# Developer Handoff — 3D Baseball Complex Visualizer (MVP)

## 1) Product snapshot

### One-liner

A web app that lets a creator design a baseball field complex in a **real-scale 2D plan** and preview it in **Babylon.js 3D**, then share a **view-only** interactive guided tour via an unguessable URL.

### MVP wedge

- Baseball field complexes first
- Broad “site visualizer” platform later

### Roles

- **Creator (editor):** single user in MVP
- **Viewer:** no login; view-only via share token (later, minimal publish backend)

## 2) Locked MVP decisions

- **Editing:** 2D top-down only (no 3D editing)
- **Scale:** real-world measurements; field presets (e.g., 180’, 220’)
- **Constraints:** assets should not overlap
- **Overlays:** measurement overlays in 2D
- **Viewer:** guided tour + **Skip tour**
- **Assets:** built-in library only (no model import in MVP)
- **Persistence:** local-first (IndexedDB)
- **Performance:** acceptable 30 FPS, target 60 FPS

## 3) Recommended stack (aligned)

- React + TypeScript + Vite
- Babylon.js (3D)
- IndexedDB via Dexie (persistence)
- Zustand (state) + **command-based undo/redo**
- rbush (spatial index) for collision acceleration (recommended)

## 4) App IA (single page w/ tabs)

Tabs:

- **Plan (2D)**: parcel + placement + measurement overlays
- **3D Preview**: lighting presets + orbit camera
- **Tour**: capture/reorder tour stops + preview
- **Share**: local export/import now; publish token later

## 5) Data model (MVP)

### Core entities

- **Project**
    - id, title, units (feet/meters), createdAt, updatedAt
- **Parcel**
    - polygon points[] in world coordinates
    - scaleCalibration (optional): calibration line + real length
- **AssetType** (built-in library)
    - id, category, name, modelRef, thumbnailRef
- **FieldPreset**
    - id, name, fenceDistanceFt (+ optional dims)
- **PlacedAsset** (instance)
    - id, assetTypeId, projectId
    - transform: position(x,y,z), rotation(yaw), scale
    - fieldConfig (only if field): fieldPresetId, surface toggles
- **TourStop**
    - id, projectId, orderIndex, title?
    - cameraPosition + cameraTarget (or rotation) + fov?

### Suggested persisted shape (single JSON)

- `project.json` contains: Project + Parcel + PlacedAssets + TourStops + library version.

## 6) Core algorithms / logic

### A) Scale calibration

Approach:

- Maintain a world coordinate system (float units).
- Calibration sets a scalar `worldUnitsPerFoot` (or inverse).
- Any measurement overlay uses calibrated conversion.

Acceptance:

- A creator can set an edge to X ft and all distances update accordingly.

### B) Non-overlap constraints

Approach:

- Each placed asset has a 2D footprint (start with OBB).
- During place/drag/rotate: compute candidate footprint; check intersection with neighbors.
- Use rbush to query nearby footprints quickly.
- Block commit when intersection exists; show red/invalid preview.

### C) Measurement overlays

- Dimension lines between two points, rendered as overlay with label.
- Field selection shows key dims (fence distance at minimum).

### D) Undo/redo (required)

Use command pattern:

- Each user action is a Command with `do()` + `undo()`.
- Commands to include: add/move vertex, add/remove asset, move/rotate asset, add/remove measurement, add/reorder tour stop.

## 7) 3D rendering (Babylon.js)

- Scene loads from project state.
- AssetType.modelRef loads GLB.
- Use instancing for repeated assets (lights, seats).
- Lighting presets: Day / Golden hour / Night.

## 8) Asset pipeline (built-in library)

- Standardize:
    - Scale (1 unit = 1 meter or 1 foot; pick and convert)
    - Pivot/origin rules (e.g., base sits on y=0)
    - Texture compression and material consistency
- Budget guidelines:
    - Keep materials per model low
    - Texture size caps

## 9) Local-first persistence + sharing

### MVP

- IndexedDB stores project JSON snapshots.
- Export/import `project.json`.

### First backend milestone (when ready)

- Minimal publish service: POST scene JSON → returns `{token}`.
- Viewer loads by token; view-only.

## 10) Milestones (condensed)

1) Shell + local persistence + export/import

2) 2D editor: parcel + measurement + placement + collisions

3) Asset library v1 + 3D preview parity

4) Tour authoring + viewer playback + skip

5) Publish backend (optional, post-local MVP)

## 11) Risks

- Undo/redo coverage
- Performance w/ realistic assets
- 2D/3D parity and coordinate conversion
- Footprint collision false-positives/negatives