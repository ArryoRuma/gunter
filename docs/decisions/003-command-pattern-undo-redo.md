# ADR 003: Command Pattern for Undo / Redo

**Status:** Accepted

---

## Context

The 2D Plan Editor and 3D Preview require user-facing **undo/redo** for all mutating operations: placing an asset, moving or rotating it, removing it, editing field configuration, and re-ordering tour stops. Without undo, design mistakes require manual correction, creating a poor creator experience.

Approaches considered:

| Approach | Pro | Con |
|----------|-----|-----|
| **Snapshot undo** | Simple to implement — just push copies of `placedAssets[]` | Memory-intensive; large arrays produce megabyte-sized snapshots per action |
| **Immer patches** | Structural sharing keeps patch size small | Extra dependency; patches are opaque and hard to label for a history UI |
| **CRDT (Automerge / Yjs)** | Free conflict-free merge | Massively over-engineered for a single-user offline tool; large bundle |
| **Command pattern** | Granular `do()`/`undo()` per operation; O(1) memory per command | More boilerplate — each operation needs its own class |

---

## Decision

Implement a **Command pattern** with a `Command` interface:

```typescript
export interface Command {
  do(): void;
  undo(): void;
  description: string;
}
```

Concrete command classes (`AddPlacedAssetCommand`, `RemovePlacedAssetCommand`, `MoveAssetCommand`, …) are instantiated with the affected data and callback closures, then dispatched through `store.executeCommand(cmd)`.

The Zustand store maintains two stacks:

```
undoStack: Command[]   ← grows on executeCommand
redoStack: Command[]   ← grows on undo; cleared on executeCommand
```

`store.undo()` pops the top of `undoStack`, calls `cmd.undo()`, and pushes to `redoStack`.
`store.redo()` pops the top of `redoStack`, calls `cmd.do()`, and pushes back to `undoStack`.

---

## Consequences

**Positive:**
- Each command stores only its delta (the asset before and after), not a full state snapshot — constant memory per operation
- Commands are self-contained and independently unit-testable without mounting a React tree
- The `description` field enables a **History panel** UI ("Added Baseball Field", "Moved Bleachers") in a future phase
- New mutating operations are additive: create a class, implement `do`/`undo`, dispatch via `executeCommand`
- The pattern integrates naturally with Dexie persistence: `do()` calls `db.placedAssets.add()`, `undo()` calls `db.placedAssets.delete()`

**Negative:**
- Every new user action requires a corresponding command class — more boilerplate than a simple `setState` diff
- Command closures reference Zustand set/get at construction time; care is needed to avoid stale closure bugs when multiple commands compose
- Compound operations (paste-multiple, group-move) require a `CompositeCommand` wrapper — planned for Phase 2
- There is no branching undo tree; the redo stack is cleared on each new action (standard linear history)
