import RBush from 'rbush';
import type { PlacedAsset, AssetType } from '@/types';

export interface OBBItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  assetId: string;
}

/** Module-level spatial index — reset this when loading a new project. */
export const spatialIndex = new RBush<OBBItem>();

/**
 * Compute an axis-aligned bounding box (AABB) for a placed asset.
 * NOTE: This is a simplified AABB that ignores rotationYaw. Phase 2 will
 * implement a proper OBB-to-AABB conversion for rotated assets.
 */
export function getAABB(asset: PlacedAsset, type: AssetType): OBBItem {
  const hw = type.footprintWidth / 2;
  const hd = type.footprintDepth / 2;
  return {
    minX: asset.transform.position.x - hw,
    minY: asset.transform.position.z - hd,
    maxX: asset.transform.position.x + hw,
    maxY: asset.transform.position.z + hd,
    assetId: asset.id,
  };
}

/**
 * Returns `true` if the candidate AABB overlaps any item in the spatial index,
 * excluding `excludeId` (use the candidate's own id to avoid self-collision).
 */
export function checkCollision(
  candidate: OBBItem,
  excludeId?: string,
): boolean {
  const nearby = spatialIndex.search(candidate);
  return nearby.some((item) => item.assetId !== excludeId);
}
