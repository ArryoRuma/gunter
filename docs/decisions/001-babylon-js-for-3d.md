# ADR 001: Use Babylon.js for 3D Rendering

**Status:** Accepted

---

## Context

Gunter requires a high-quality, real-time 3D rendering engine to let creators preview baseball field complexes at true scale in a browser. Key requirements:

- Load and display **GLB/GLTF** 3D asset models at runtime
- **Arc-rotate and fly-through camera controls** for both freeform exploration and guided tour playback
- Strong **TypeScript** support — the codebase is strict-mode TS throughout
- **Tree-shakeable ESM** build to keep the production bundle lean
- Active maintenance and a large community for long-term viability

Candidates evaluated:

| Library | Pro | Con |
|---------|-----|-----|
| **Babylon.js** | First-class TS, built-in GLTF loader, arc/fly cameras, inspector | Larger than Three.js if not tree-shaken |
| Three.js | Most popular, mature ecosystem | Requires add-on camera controls, separate GLTF loader, TS types are community-maintained |
| PlayCanvas | Good editor integration | Commercial SaaS dependency for editor features |
| Spline (embed) | Easy authoring | Embed-only, no programmatic asset placement |

---

## Decision

Use **Babylon.js** via `@babylonjs/core` and `@babylonjs/loaders`.

Import only the sub-packages and classes needed (e.g. `import { Engine } from '@babylonjs/core/Engines/engine'`) to leverage Babylon's tree-shaking-friendly ESM exports.

---

## Consequences

**Positive:**
- `@babylonjs/core` ships its own `.d.ts` files — no `@types/` package needed
- `ArcRotateCamera` and `FlyCamera` are ready for Phase 3 and Phase 4 without extra dependencies
- `SceneLoader.ImportMeshAsync` handles GLB loading with progressive streaming
- The Babylon Inspector (dev-only) shortens debugging cycles for 3D scene work
- Babylon's observable/event system integrates cleanly with Zustand's `subscribe`

**Negative:**
- Full `@babylonjs/core` bundle is ~2 MB raw; proper per-class imports are **required** to stay under 400 kB gzip
- Contributors already familiar with Three.js face a learning curve for Babylon's scene graph API
- Advanced subsystems (Havok physics, GUI layer, particle system) each require additional `@babylonjs/*` sub-packages
