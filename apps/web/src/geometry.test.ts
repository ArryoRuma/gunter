import { describe, expect, it } from 'vitest'
import { isAssetInsideParcel, overlapsAnyAsset } from './geometry'
import type { PlacedAsset, Point } from './types'

describe('geometry placement checks', () => {
  const parcel: Point[] = [
    { x: 0, y: 0 },
    { x: 200, y: 0 },
    { x: 200, y: 200 },
    { x: 0, y: 200 },
  ]

  it('detects asset inside parcel', () => {
    const asset: PlacedAsset = {
      id: 'a1',
      typeId: 'field-180',
      x: 60,
      y: 60,
      width: 40,
      height: 40,
      rotationDeg: 0,
    }
    expect(isAssetInsideParcel(asset, parcel)).toBe(true)
  })

  it('detects overlap with existing assets', () => {
    const existing: PlacedAsset[] = [
      {
        id: 'a1',
        typeId: 'field-180',
        x: 60,
        y: 60,
        width: 40,
        height: 40,
        rotationDeg: 0,
      },
    ]
    const candidate: PlacedAsset = {
      id: 'a2',
      typeId: 'concessions',
      x: 70,
      y: 60,
      width: 40,
      height: 40,
      rotationDeg: 0,
    }
    expect(overlapsAnyAsset(candidate, existing)).toBe(true)
  })
})
