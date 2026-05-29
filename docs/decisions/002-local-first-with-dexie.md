# ADR 002: Local-First Persistence with Dexie (IndexedDB)

**Status:** Accepted

---

## Context

Gunter is a design tool that creators will use in a browser, often in environments with unreliable internet (job sites, stadiums under construction). Project data — parcels, placed assets, and tour stops — can grow to thousands of entities in a complex multi-field design.

Requirements:
- Works **fully offline**, including on `localhost` and from a local file server
- **Fast read/write** without round-trips to a backend
- **Schema versioning** so future phases can add indexes without breaking existing projects
- **Exportable** to a single portable JSON document for the Share tab
- **No backend infrastructure** in Phase 0–5 MVP

Candidates evaluated:

| Storage | Pro | Con |
|---------|-----|-----|
| `localStorage` | Simple API | 5–10 MB limit; synchronous; no indexing |
| Raw IndexedDB | No extra dependency | Extremely verbose async API; error-prone |
| **Dexie** | Clean Promise API, typed generics, schema versioning | Adds ~50 kB (gzip: ~14 kB) |
| PouchDB | CouchDB sync built-in | 200 kB overhead; sync features not needed for MVP |

---

## Decision

Use **Dexie v4** as the IndexedDB abstraction layer, with a typed `GunterDB` class extending `Dexie`.

Each domain entity (`Project`, `Parcel`, `PlacedAsset`, `TourStop`) gets its own table with typed `EntityTable<T, 'id'>` declarations.

---

## Consequences

**Positive:**
- `EntityTable<T, KeyType>` generics provide compile-time safety on `db.projects.add()`, `.get()`, etc.
- IndexedDB quotas are browser-managed (typically 50 %+ of free disk) — no practical size limit for design projects
- `this.version(N).stores({...})` enables non-destructive schema migrations in later phases
- The Share tab's `ProjectDocument` export/import is a simple JSON serialisation of Dexie queries — no special sync protocol required
- Works with `file://` origins (no server required for local demo)

**Negative:**
- Data lives on the user's device and browser profile — clearing browser data deletes projects unless the user exports first
- No real-time multi-device sync in MVP; multi-device access requires explicit Share → Import flow
- IndexedDB is transactional but not relational; joins (e.g., loading a project with all its assets) require app-level Promise.all
- Dexie live-query hooks (`useLiveQuery`) are useful for reactive UI but add a peer-dependency on `dexie-react-hooks` — deferred to Phase 2
