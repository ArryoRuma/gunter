import type { PlacedAsset, Point } from './types'

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y
    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    if (intersects) {
      inside = !inside
    }
  }
  return inside
}

export function getAssetCorners(asset: PlacedAsset): Point[] {
  const halfWidth = asset.width / 2
  const halfHeight = asset.height / 2
  const angleRad = (asset.rotationDeg * Math.PI) / 180
  const cosAngle = Math.cos(angleRad)
  const sinAngle = Math.sin(angleRad)
  const localCorners = [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ]
  return localCorners.map((corner) => ({
    x: asset.x + corner.x * cosAngle - corner.y * sinAngle,
    y: asset.y + corner.x * sinAngle + corner.y * cosAngle,
  }))
}

function projectPolygon(axis: Point, polygon: Point[]): { min: number; max: number } {
  let min = polygon[0].x * axis.x + polygon[0].y * axis.y
  let max = min
  for (let i = 1; i < polygon.length; i += 1) {
    const projection = polygon[i].x * axis.x + polygon[i].y * axis.y
    min = Math.min(min, projection)
    max = Math.max(max, projection)
  }
  return { min, max }
}

export function polygonsOverlap(first: Point[], second: Point[]): boolean {
  const polygons = [first, second]
  for (const polygon of polygons) {
    for (let i = 0; i < polygon.length; i += 1) {
      const next = (i + 1) % polygon.length
      const edge = {
        x: polygon[next].x - polygon[i].x,
        y: polygon[next].y - polygon[i].y,
      }
      const axis = { x: -edge.y, y: edge.x }
      const axisLength = Math.hypot(axis.x, axis.y)
      if (axisLength === 0) {
        continue
      }
      const normalizedAxis = { x: axis.x / axisLength, y: axis.y / axisLength }
      const firstProjection = projectPolygon(normalizedAxis, first)
      const secondProjection = projectPolygon(normalizedAxis, second)
      if (
        firstProjection.max < secondProjection.min ||
        secondProjection.max < firstProjection.min
      ) {
        return false
      }
    }
  }
  return true
}

export function isAssetInsideParcel(asset: PlacedAsset, parcel: Point[]): boolean {
  const corners = getAssetCorners(asset)
  return corners.every((corner) => isPointInPolygon(corner, parcel))
}

export function overlapsAnyAsset(candidate: PlacedAsset, assets: PlacedAsset[]): boolean {
  const candidateCorners = getAssetCorners(candidate)
  return assets.some((asset) => {
    if (asset.id === candidate.id) {
      return false
    }
    return polygonsOverlap(candidateCorners, getAssetCorners(asset))
  })
}
