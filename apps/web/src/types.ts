export type EditorMode =
  | 'draw-parcel'
  | 'edit-parcel'
  | 'calibrate-scale'
  | 'place-asset'
  | 'move-asset'

export type TabId = 'plan' | 'preview' | 'tour' | 'share'

export interface Point {
  x: number
  y: number
}

export interface AssetType {
  id: string
  name: string
  widthFt: number
  heightFt: number
  color: string
}

export interface PlacedAsset {
  id: string
  typeId: string
  x: number
  y: number
  width: number
  height: number
  rotationDeg: number
}

export interface ScaleCalibration {
  firstPoint: Point
  secondPoint: Point
  realWorldFeet: number
}

export interface CameraPose {
  position: {
    x: number
    y: number
    z: number
  }
  target: {
    x: number
    y: number
    z: number
  }
}

export interface TourStop {
  id: string
  orderIndex: number
  title: string
  camera: CameraPose
}

export interface ProjectDocument {
  version: 1
  title: string
  units: 'feet'
  parcelPoints: Point[]
  assets: PlacedAsset[]
  calibration: ScaleCalibration | null
  tourStops: TourStop[]
}

export interface PlanSnapshot {
  parcelPoints: Point[]
  assets: PlacedAsset[]
  calibration: ScaleCalibration | null
}
