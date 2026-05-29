import type { PlacedAsset, Transform } from '@/types';

export interface Command {
  do(): void;
  undo(): void;
  description: string;
}

// ─── Concrete command stubs — to be filled in per phase ────────────────────

export class AddPlacedAssetCommand implements Command {
  description = 'Add asset';

  constructor(
    private asset: PlacedAsset,
    private onDo: (a: PlacedAsset) => void,
    private onUndo: (id: string) => void,
  ) {}

  do() {
    this.onDo(this.asset);
  }

  undo() {
    this.onUndo(this.asset.id);
  }
}

export class RemovePlacedAssetCommand implements Command {
  description = 'Remove asset';

  constructor(
    private asset: PlacedAsset,
    private onDo: (id: string) => void,
    private onUndo: (a: PlacedAsset) => void,
  ) {}

  do() {
    this.onDo(this.asset.id);
  }

  undo() {
    this.onUndo(this.asset);
  }
}

export class MoveAssetCommand implements Command {
  description = 'Move asset';

  constructor(
    private assetId: string,
    private from: Transform,
    private to: Transform,
    private onApply: (id: string, t: Transform) => void,
  ) {}

  do() {
    this.onApply(this.assetId, this.to);
  }

  undo() {
    this.onApply(this.assetId, this.from);
  }
}
