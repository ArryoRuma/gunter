import Dexie, { type EntityTable } from 'dexie';
import type { Project, Parcel, PlacedAsset, TourStop } from '@/types';

export class GunterDB extends Dexie {
  projects!: EntityTable<Project, 'id'>;
  parcels!: EntityTable<Parcel, 'id'>;
  placedAssets!: EntityTable<PlacedAsset, 'id'>;
  tourStops!: EntityTable<TourStop, 'id'>;

  constructor() {
    super('GunterDB');
    this.version(1).stores({
      projects: 'id, updatedAt',
      parcels: 'id, projectId',
      placedAssets: 'id, projectId, assetTypeId',
      tourStops: 'id, projectId, orderIndex',
    });
  }
}

export const db = new GunterDB();
