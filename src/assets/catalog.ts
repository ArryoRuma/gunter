import type { AssetType, FieldPreset } from '@/types';

export const FIELD_PRESETS: FieldPreset[] = [
  {
    id: 'field-180',
    name: '180ft Youth Field',
    fenceDistanceFt: 180,
    basePathFt: 60,
    pitchingDistanceFt: 46,
  },
  {
    id: 'field-200',
    name: '200ft Intermediate Field',
    fenceDistanceFt: 200,
    basePathFt: 70,
    pitchingDistanceFt: 50,
  },
  {
    id: 'field-220',
    name: '220ft Junior Field',
    fenceDistanceFt: 220,
    basePathFt: 80,
    pitchingDistanceFt: 54,
  },
  {
    id: 'field-300',
    name: '300ft High School Field',
    fenceDistanceFt: 300,
    basePathFt: 90,
    pitchingDistanceFt: 60.5,
  },
];

export const ASSET_TYPES: AssetType[] = [
  {
    id: 'baseball-field',
    category: 'field',
    name: 'Baseball Field',
    modelRef: '/models/baseball-field.glb',
    thumbnailRef: '/thumbnails/baseball-field.png',
    footprintWidth: 200,
    footprintDepth: 200,
  },
  {
    id: 'concession-stand',
    category: 'concessions',
    name: 'Concession Stand',
    modelRef: '/models/concession-stand.glb',
    thumbnailRef: '/thumbnails/concession-stand.png',
    footprintWidth: 12,
    footprintDepth: 8,
  },
  {
    id: 'parking-lot',
    category: 'parking',
    name: 'Parking Lot Module',
    modelRef: '/models/parking-lot.glb',
    thumbnailRef: '/thumbnails/parking-lot.png',
    footprintWidth: 30,
    footprintDepth: 60,
  },
  {
    id: 'batting-cage',
    category: 'batting_cage',
    name: 'Batting Cage',
    modelRef: '/models/batting-cage.glb',
    thumbnailRef: '/thumbnails/batting-cage.png',
    footprintWidth: 6,
    footprintDepth: 18,
  },
  {
    id: 'bleachers',
    category: 'seating',
    name: 'Bleachers',
    modelRef: '/models/bleachers.glb',
    thumbnailRef: '/thumbnails/bleachers.png',
    footprintWidth: 20,
    footprintDepth: 6,
  },
  {
    id: 'light-tower',
    category: 'lighting',
    name: 'Light Tower',
    modelRef: '/models/light-tower.glb',
    thumbnailRef: '/thumbnails/light-tower.png',
    footprintWidth: 2,
    footprintDepth: 2,
  },
];
