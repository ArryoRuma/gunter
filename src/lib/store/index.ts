import { create } from 'zustand';
import type { Project, Parcel, PlacedAsset, TourStop } from '@/types';
import type { Command } from '@/lib/commands';

export type TabId = 'plan' | 'preview' | 'tour' | 'share';

interface GunterState {
  // ── UI state ──────────────────────────────────────────────────────────────
  activeTab: TabId;

  // ── Project state ─────────────────────────────────────────────────────────
  activeProjectId: string | null;
  project: Project | null;
  parcel: Parcel | null;
  placedAssets: PlacedAsset[];
  tourStops: TourStop[];

  // ── Command history ───────────────────────────────────────────────────────
  undoStack: Command[];
  redoStack: Command[];

  // ── Actions ───────────────────────────────────────────────────────────────
  setActiveTab: (tab: TabId) => void;
  setProject: (project: Project | null) => void;
  setParcel: (parcel: Parcel | null) => void;
  setPlacedAssets: (assets: PlacedAsset[]) => void;
  setTourStops: (stops: TourStop[]) => void;
  executeCommand: (cmd: Command) => void;
  undo: () => void;
  redo: () => void;
}

export const useGunterStore = create<GunterState>((set, get) => ({
  // ── Initial state ─────────────────────────────────────────────────────────
  activeTab: 'plan',
  activeProjectId: null,
  project: null,
  parcel: null,
  placedAssets: [],
  tourStops: [],
  undoStack: [],
  redoStack: [],

  // ── Action implementations ────────────────────────────────────────────────
  setActiveTab: (tab) => set({ activeTab: tab }),

  setProject: (project) =>
    set({ project, activeProjectId: project?.id ?? null }),

  setParcel: (parcel) => set({ parcel }),

  setPlacedAssets: (assets) => set({ placedAssets: assets }),

  setTourStops: (stops) => set({ tourStops: stops }),

  executeCommand: (cmd) => {
    cmd.do();
    set((state) => ({
      undoStack: [...state.undoStack, cmd],
      redoStack: [], // a new action clears the redo stack
    }));
  },

  undo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return;
    const cmd = undoStack[undoStack.length - 1];
    cmd.undo();
    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, cmd],
    }));
  },

  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return;
    const cmd = redoStack[redoStack.length - 1];
    cmd.do();
    set((state) => ({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, cmd],
    }));
  },
}));
