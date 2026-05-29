export type Point2D = { x: number; y: number };
export type Point3D = { x: number; y: number; z: number };
export type ScaleUnit = 'feet' | 'meters';
export type SurfaceType = 'turf' | 'grass';

export interface Project {
  id: string;
  title: string;
  units: ScaleUnit;
  createdAt: string; // ISO date string
  updatedAt: string;
}

export interface ScaleCalibration {
  calibrationLine: [Point2D, Point2D];
  realWorldLength: number;
  unit: ScaleUnit;
}

export interface Parcel {
  id: string;
  projectId: string;
  polygon: Point2D[];
  scaleCalibration?: ScaleCalibration;
}

export type AssetCategory =
  | 'field'
  | 'concessions'
  | 'parking'
  | 'batting_cage'
  | 'seating'
  | 'lighting'
  | 'other';

export interface AssetType {
  id: string;
  category: AssetCategory;
  name: string;
  modelRef: string; // path to GLB
  thumbnailRef: string; // path to thumbnail image
  footprintWidth: number; // in world units
  footprintDepth: number; // in world units
}

export interface FieldPreset {
  id: string;
  name: string;
  fenceDistanceFt: number;
  basePathFt?: number;
  pitchingDistanceFt?: number;
}

export interface FieldConfig {
  fieldPresetId: string;
  surfaceInfield: SurfaceType;
  surfaceOutfield: SurfaceType;
}

export interface Transform {
  position: Point3D;
  rotationYaw: number; // radians
  scale: Point3D;
}

export interface PlacedAsset {
  id: string;
  projectId: string;
  assetTypeId: string;
  transform: Transform;
  label?: string;
  fieldConfig?: FieldConfig;
}

export interface TourStop {
  id: string;
  projectId: string;
  orderIndex: number;
  title?: string;
  cameraPosition: Point3D;
  cameraTarget: Point3D;
  fov?: number;
}

/** The full exportable project document */
export interface ProjectDocument {
  project: Project;
  parcel?: Parcel;
  placedAssets: PlacedAsset[];
  tourStops: TourStop[];
  libraryVersion: string;
}
