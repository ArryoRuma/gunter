import type { AssetType } from './types'

export const ASSET_TYPES: AssetType[] = [
  { id: 'field-180', name: "Field 180'", widthFt: 180, heightFt: 180, color: '#3177c9' },
  { id: 'field-220', name: "Field 220'", widthFt: 220, heightFt: 220, color: '#2563a5' },
  { id: 'concessions', name: 'Concessions', widthFt: 56, heightFt: 40, color: '#c15d1d' },
  { id: 'parking', name: 'Parking Module', widthFt: 120, heightFt: 80, color: '#4c5c72' },
  { id: 'batting-cages', name: 'Batting Cages', widthFt: 90, heightFt: 32, color: '#7648b0' },
  { id: 'lighting', name: 'Lighting Cluster', widthFt: 24, heightFt: 24, color: '#be8a12' },
]

export function getAssetType(typeId: string): AssetType {
  return ASSET_TYPES.find((assetType) => assetType.id === typeId) ?? ASSET_TYPES[0]
}
