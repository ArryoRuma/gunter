import { create } from 'zustand'
import { ASSET_TYPES } from './assets'
import type {
  EditorMode,
  PlanSnapshot,
  PlacedAsset,
  Point,
  ProjectDocument,
  ScaleCalibration,
  TabId,
  TourStop,
} from './types'

type EnvironmentPreset = 'day' | 'dusk'

type HistoryCommand = {
  description: string
  do: () => void
  undo: () => void
}

export type ValidationConflict =
  | {
      id: string
      type: 'outside-parcel'
      assetId: string
      message: string
    }
  | {
      id: string
      type: 'overlap'
      assetIds: [string, string]
      message: string
    }

type EditorState = {
  activeTab: TabId
  mode: EditorMode
  projectTitle: string
  parcelPoints: Point[]
  assets: PlacedAsset[]
  selectedAssetTypeId: string
  selectedAssetIds: string[]
  calibration: ScaleCalibration | null
  calibrationDraft: Point[]
  calibrationFeetInput: string
  status: string
  tourStops: TourStop[]
  activeTourStopId: string | null
  environmentPreset: EnvironmentPreset
  shareToken: string
  undoStack: HistoryCommand[]
  redoStack: HistoryCommand[]
  setActiveTab: (tabId: TabId) => void
  setMode: (mode: EditorMode) => void
  setProjectTitle: (title: string) => void
  setParcelPoints: (parcelPoints: Point[]) => void
  setAssets: (assets: PlacedAsset[]) => void
  setSelectedAssetTypeId: (typeId: string) => void
  setSelectedAssetIds: (assetIds: string[]) => void
  setCalibration: (calibration: ScaleCalibration | null) => void
  setCalibrationDraft: (points: Point[]) => void
  setCalibrationFeetInput: (feet: string) => void
  setStatus: (message: string) => void
  setTourStops: (tourStops: TourStop[]) => void
  setActiveTourStopId: (id: string | null) => void
  setEnvironmentPreset: (preset: EnvironmentPreset) => void
  setShareToken: (token: string) => void
  initializeFromProject: (project: ProjectDocument | null) => void
  getPlanSnapshot: () => PlanSnapshot
  commitPlanTransition: (
    description: string,
    previous: PlanSnapshot,
    next: PlanSnapshot,
    statusMessage?: string,
  ) => void
  executeHistoryCommand: (command: HistoryCommand) => void
  undo: () => void
  redo: () => void
}

function sortTourStops(stops: TourStop[]): TourStop[] {
  return [...stops].sort((a, b) => a.orderIndex - b.orderIndex)
}

function initialState() {
  return {
    activeTab: 'plan' as TabId,
    mode: 'draw-parcel' as EditorMode,
    projectTitle: 'Baseball Complex Plan',
    parcelPoints: [] as Point[],
    assets: [] as PlacedAsset[],
    selectedAssetTypeId: ASSET_TYPES[0].id,
    selectedAssetIds: [] as string[],
    calibration: null as ScaleCalibration | null,
    calibrationDraft: [] as Point[],
    calibrationFeetInput: '180',
    status: 'Draw a parcel by clicking points on the canvas.',
    tourStops: [] as TourStop[],
    activeTourStopId: null as string | null,
    environmentPreset: 'day' as EnvironmentPreset,
    shareToken: '',
    undoStack: [] as HistoryCommand[],
    redoStack: [] as HistoryCommand[],
  }
}

export const useEditorStore = create<EditorState>((set, get) => ({
  ...initialState(),
  setActiveTab: (activeTab) => set({ activeTab }),
  setMode: (mode) => set({ mode }),
  setProjectTitle: (projectTitle) => set({ projectTitle }),
  setParcelPoints: (parcelPoints) => set({ parcelPoints }),
  setAssets: (assets) => set({ assets }),
  setSelectedAssetTypeId: (selectedAssetTypeId) => set({ selectedAssetTypeId }),
  setSelectedAssetIds: (selectedAssetIds) => set({ selectedAssetIds }),
  setCalibration: (calibration) => set({ calibration }),
  setCalibrationDraft: (calibrationDraft) => set({ calibrationDraft }),
  setCalibrationFeetInput: (calibrationFeetInput) => set({ calibrationFeetInput }),
  setStatus: (status) => set({ status }),
  setTourStops: (tourStops) => set({ tourStops: sortTourStops(tourStops) }),
  setActiveTourStopId: (activeTourStopId) => set({ activeTourStopId }),
  setEnvironmentPreset: (environmentPreset) => set({ environmentPreset }),
  setShareToken: (shareToken) => set({ shareToken }),
  initializeFromProject: (project) => {
    const base = initialState()
    if (!project) {
      set(base)
      return
    }
    set({
      ...base,
      projectTitle: project.title,
      parcelPoints: project.parcelPoints,
      assets: project.assets,
      calibration: project.calibration,
      tourStops: sortTourStops(project.tourStops),
      status: 'Project restored from local storage.',
    })
  },
  getPlanSnapshot: () => {
    const state = get()
    return {
      parcelPoints: state.parcelPoints,
      assets: state.assets,
      calibration: state.calibration,
    }
  },
  commitPlanTransition: (description, previous, next, statusMessage) => {
    const command: HistoryCommand = {
      description,
      do: () =>
        set({
          parcelPoints: next.parcelPoints,
          assets: next.assets,
          calibration: next.calibration,
          status: statusMessage ?? `Applied: ${description}`,
        }),
      undo: () =>
        set({
          parcelPoints: previous.parcelPoints,
          assets: previous.assets,
          calibration: previous.calibration,
          status: `Undid: ${description}`,
        }),
    }
    get().executeHistoryCommand(command)
  },
  executeHistoryCommand: (command) => {
    command.do()
    set((state) => ({
      undoStack: [...state.undoStack, command],
      redoStack: [],
    }))
  },
  undo: () => {
    const stack = get().undoStack
    const command = stack[stack.length - 1]
    if (!command) {
      set({ status: 'Nothing to undo.' })
      return
    }
    command.undo()
    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, command],
    }))
  },
  redo: () => {
    const stack = get().redoStack
    const command = stack[stack.length - 1]
    if (!command) {
      set({ status: 'Nothing to redo.' })
      return
    }
    command.do()
    set((state) => ({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, command],
    }))
  },
}))
