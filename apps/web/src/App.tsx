import {
  useCallback,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { BabylonPreview } from './BabylonPreview'
import { ASSET_TYPES, getAssetType } from './assets'
import { useEditorStore } from './editorStore'
import {
  distance,
  getAssetCorners,
  isAssetInsideParcel,
  isPointInPolygon,
  midpoint,
  polygonsOverlap,
} from './geometry'
import './App.css'
import type {
  PlanSnapshot,
  PlacedAsset,
  Point,
  ProjectDocument,
  ScaleCalibration,
  TabId,
  TourStop,
} from './types'

const STORAGE_KEY = 'gunter-project-v1'
const CANVAS_WIDTH = 1000
const CANVAS_HEIGHT = 640
const DEFAULT_FEET_PER_WORLD_UNIT = 1

type Conflict =
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

type AssetDragSession = {
  startPoint: Point
  beforeAssets: PlacedAsset[]
  assetIds: string[]
}

type ParcelDragSession = {
  vertexIndex: number
  beforeParcel: Point[]
}

type RotateSession = {
  assetId: string
  center: Point
  initialPointerAngle: number
  beforeAssets: PlacedAsset[]
}

type MarqueeSession = {
  startPoint: Point
}

function parseStoredProject(raw: string): ProjectDocument | null {
  const parsed = JSON.parse(raw) as ProjectDocument
  if (parsed.version !== 1 || !Array.isArray(parsed.parcelPoints) || !Array.isArray(parsed.assets)) {
    return null
  }
  return parsed
}

function loadInitialProject(): ProjectDocument | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }
  return parseStoredProject(raw)
}

function feetPerWorldUnit(calibration: ScaleCalibration | null): number {
  if (!calibration) {
    return DEFAULT_FEET_PER_WORLD_UNIT
  }
  const worldDistance = distance(calibration.firstPoint, calibration.secondPoint)
  if (worldDistance <= 0 || calibration.realWorldFeet <= 0) {
    return DEFAULT_FEET_PER_WORLD_UNIT
  }
  return calibration.realWorldFeet / worldDistance
}

function toWorldUnits(feet: number, feetPerUnit: number): number {
  return feet / feetPerUnit
}

function formatFeet(value: number): string {
  return `${value.toFixed(1)} ft`
}

function toCanvasPoint(clientX: number, clientY: number, rect: DOMRect): Point {
  return {
    x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
    y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
  }
}

function getSvgPoint(event: ReactPointerEvent<SVGSVGElement>): Point {
  return toCanvasPoint(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())
}

function getSvgPointFromCircle(event: ReactPointerEvent<SVGCircleElement>): Point | null {
  const svg = event.currentTarget.ownerSVGElement
  if (!svg) {
    return null
  }
  return toCanvasPoint(event.clientX, event.clientY, svg.getBoundingClientRect())
}

function sortTourStops(stops: TourStop[]): TourStop[] {
  return [...stops].sort((a, b) => a.orderIndex - b.orderIndex)
}

function pointInRect(point: Point, rect: { minX: number; minY: number; maxX: number; maxY: number }): boolean {
  return point.x >= rect.minX && point.x <= rect.maxX && point.y >= rect.minY && point.y <= rect.maxY
}

function getNormalizedRect(first: Point, second: Point): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} {
  return {
    minX: Math.min(first.x, second.x),
    minY: Math.min(first.y, second.y),
    maxX: Math.max(first.x, second.x),
    maxY: Math.max(first.y, second.y),
  }
}

function normalizeDegrees(value: number): number {
  const normalized = value % 360
  return normalized < 0 ? normalized + 360 : normalized
}

function snapValue(value: number, gridSize: number): number {
  if (gridSize <= 0) {
    return value
  }
  return Math.round(value / gridSize) * gridSize
}

function snapPoint(point: Point, gridSize: number): Point {
  return {
    x: snapValue(point.x, gridSize),
    y: snapValue(point.y, gridSize),
  }
}

function rotatePointAround(point: Point, center: Point, radians: number): Point {
  const dx = point.x - center.x
  const dy = point.y - center.y
  const cosAngle = Math.cos(radians)
  const sinAngle = Math.sin(radians)
  return {
    x: center.x + dx * cosAngle - dy * sinAngle,
    y: center.y + dx * sinAngle + dy * cosAngle,
  }
}

function selectionCenter(selectedAssets: PlacedAsset[]): Point {
  if (selectedAssets.length === 0) {
    return { x: 0, y: 0 }
  }
  const sum = selectedAssets.reduce(
    (accumulator, asset) => ({ x: accumulator.x + asset.x, y: accumulator.y + asset.y }),
    { x: 0, y: 0 },
  )
  return {
    x: sum.x / selectedAssets.length,
    y: sum.y / selectedAssets.length,
  }
}

function assetsEqual(first: PlacedAsset[], second: PlacedAsset[]): boolean {
  if (first.length !== second.length) {
    return false
  }
  for (let index = 0; index < first.length; index += 1) {
    const left = first[index]
    const right = second[index]
    if (
      left.id !== right.id ||
      left.x !== right.x ||
      left.y !== right.y ||
      left.rotationDeg !== right.rotationDeg ||
      left.width !== right.width ||
      left.height !== right.height ||
      left.typeId !== right.typeId
    ) {
      return false
    }
  }
  return true
}

function createConflicts(assets: PlacedAsset[], parcelPoints: Point[]): Conflict[] {
  const conflicts: Conflict[] = []
  const parcelClosed = parcelPoints.length >= 3
  if (parcelClosed) {
    for (const asset of assets) {
      if (!isAssetInsideParcel(asset, parcelPoints)) {
        conflicts.push({
          id: `outside-${asset.id}`,
          type: 'outside-parcel',
          assetId: asset.id,
          message: `${getAssetType(asset.typeId).name} is outside parcel bounds.`,
        })
      }
    }
  }
  for (let firstIndex = 0; firstIndex < assets.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < assets.length; secondIndex += 1) {
      const firstAsset = assets[firstIndex]
      const secondAsset = assets[secondIndex]
      const overlaps = polygonsOverlap(getAssetCorners(firstAsset), getAssetCorners(secondAsset))
      if (overlaps) {
        conflicts.push({
          id: `overlap-${firstAsset.id}-${secondAsset.id}`,
          type: 'overlap',
          assetIds: [firstAsset.id, secondAsset.id],
          message: `${getAssetType(firstAsset.typeId).name} overlaps ${getAssetType(secondAsset.typeId).name}.`,
        })
      }
    }
  }
  return conflicts
}

function App() {
  const {
    activeTab,
    mode,
    projectTitle,
    parcelPoints,
    assets,
    selectedAssetTypeId,
    selectedAssetIds,
    calibration,
    calibrationDraft,
    calibrationFeetInput,
    status,
    tourStops,
    activeTourStopId,
    environmentPreset,
    shareToken,
    undoStack,
    redoStack,
    setActiveTab,
    setMode,
    setProjectTitle,
    setParcelPoints,
    setAssets,
    setSelectedAssetTypeId,
    setSelectedAssetIds,
    setCalibrationDraft,
    setCalibrationFeetInput,
    setStatus,
    setTourStops,
    setActiveTourStopId,
    setEnvironmentPreset,
    setShareToken,
    initializeFromProject,
    commitPlanTransition,
    undo,
    redo,
  } = useEditorStore()

  const bootstrappedRef = useRef(false)
  const parcelDragSessionRef = useRef<ParcelDragSession | null>(null)
  const assetDragSessionRef = useRef<AssetDragSession | null>(null)
  const rotateSessionRef = useRef<RotateSession | null>(null)
  const marqueeSessionRef = useRef<MarqueeSession | null>(null)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [gridSize, setGridSize] = useState(16)
  const [marqueeRect, setMarqueeRect] = useState<{
    minX: number
    minY: number
    maxX: number
    maxY: number
  } | null>(null)

  useEffect(() => {
    if (bootstrappedRef.current) {
      return
    }
    initializeFromProject(loadInitialProject())
    bootstrappedRef.current = true
  }, [initializeFromProject])

  useEffect(() => {
    const document: ProjectDocument = {
      version: 1,
      title: projectTitle,
      units: 'feet',
      parcelPoints,
      assets,
      calibration,
      tourStops: sortTourStops(tourStops),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(document))
  }, [assets, calibration, parcelPoints, projectTitle, tourStops])

  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedAssetIds.includes(asset.id)),
    [assets, selectedAssetIds],
  )

  const selectedAssetSet = useMemo(() => new Set(selectedAssetIds), [selectedAssetIds])
  const conflicts = useMemo(() => createConflicts(assets, parcelPoints), [assets, parcelPoints])
  const previewReady = conflicts.length === 0
  const parcelClosed = parcelPoints.length >= 3

  const planSnapshot = useMemo<PlanSnapshot>(
    () => ({ parcelPoints, assets, calibration }),
    [assets, calibration, parcelPoints],
  )

  const commitPlan = useCallback((
    description: string,
    next: PlanSnapshot,
    statusMessage?: string,
    previousSnapshot = planSnapshot,
  ): void => {
    commitPlanTransition(description, previousSnapshot, next, statusMessage)
  }, [commitPlanTransition, planSnapshot])

  const feetPerUnit = useMemo(() => feetPerWorldUnit(calibration), [calibration])
  const selectedAssetType = useMemo(
    () => ASSET_TYPES.find((assetType) => assetType.id === selectedAssetTypeId) ?? ASSET_TYPES[0],
    [selectedAssetTypeId],
  )

  const sortedTourStops = useMemo(() => sortTourStops(tourStops), [tourStops])
  const activeTourStop = useMemo(
    () => sortedTourStops.find((stop) => stop.id === activeTourStopId) ?? null,
    [activeTourStopId, sortedTourStops],
  )

  const measurementLabels = useMemo(() => {
    if (parcelPoints.length < 2) {
      return []
    }
    return parcelPoints.map((point, index) => {
      const nextPoint = parcelPoints[(index + 1) % parcelPoints.length]
      const mid = midpoint(point, nextPoint)
      const lengthFeet = distance(point, nextPoint) * feetPerUnit
      return {
        id: `${index}-${index + 1}`,
        x: mid.x,
        y: mid.y,
        text: formatFeet(lengthFeet),
      }
    })
  }, [feetPerUnit, parcelPoints])

  const createAssetFromPoint = (point: Point): PlacedAsset => {
    const width = toWorldUnits(selectedAssetType.widthFt, feetPerUnit)
    const height = toWorldUnits(selectedAssetType.heightFt, feetPerUnit)
    return {
      id: crypto.randomUUID(),
      typeId: selectedAssetType.id,
      x: point.x,
      y: point.y,
      width,
      height,
      rotationDeg: 0,
    }
  }

  const setTabWithReadinessCheck = (tabId: TabId): void => {
    if ((tabId === 'preview' || tabId === 'share') && !previewReady) {
      setStatus('Resolve parcel conflicts before opening preview or export tools.')
      return
    }
    setActiveTab(tabId)
  }

  const setSelectionFromPointer = (assetId: string, additive: boolean): string[] => {
    if (!additive) {
      setSelectedAssetIds([assetId])
      return [assetId]
    }
    const selected = selectedAssetIds.includes(assetId)
    const nextSelection = selected
      ? selectedAssetIds.filter((id) => id !== assetId)
      : [...selectedAssetIds, assetId]
    setSelectedAssetIds(nextSelection)
    return nextSelection
  }

  const commitRotateSelection = useCallback((deltaDegrees: number, precise = false): void => {
    if (selectedAssetIds.length === 0) {
      setStatus('Select at least one asset to rotate.')
      return
    }
    const center = selectionCenter(selectedAssets)
    const radians = (deltaDegrees * Math.PI) / 180
    const nextAssets = assets.map((asset) => {
      if (!selectedAssetIds.includes(asset.id)) {
        return asset
      }
      const nextPoint = rotatePointAround({ x: asset.x, y: asset.y }, center, radians)
      return {
        ...asset,
        x: nextPoint.x,
        y: nextPoint.y,
        rotationDeg: normalizeDegrees(asset.rotationDeg + deltaDegrees),
      }
    })
    commitPlan(
      precise ? 'Fine rotate selected assets' : 'Rotate selected assets',
      {
        ...planSnapshot,
        assets: nextAssets,
      },
      `Rotated ${selectedAssetIds.length} asset(s).`,
    )
  }, [assets, commitPlan, planSnapshot, selectedAssetIds, selectedAssets, setStatus])

  const commitDeleteSelection = useCallback((): void => {
    if (selectedAssetIds.length === 0) {
      setStatus('Select assets before deleting.')
      return
    }
    const nextAssets = assets.filter((asset) => !selectedAssetIds.includes(asset.id))
    commitPlan(
      selectedAssetIds.length === 1 ? 'Delete asset' : 'Delete selected assets',
      {
        ...planSnapshot,
        assets: nextAssets,
      },
      `Deleted ${selectedAssetIds.length} asset(s).`,
    )
    setSelectedAssetIds([])
  }, [assets, commitPlan, planSnapshot, selectedAssetIds, setSelectedAssetIds, setStatus])

  const commitDuplicateSelection = useCallback((): void => {
    if (selectedAssetIds.length === 0) {
      setStatus('Select assets before duplicating.')
      return
    }
    const selected = assets.filter((asset) => selectedAssetIds.includes(asset.id))
    const duplicates = selected.map((asset) => ({
      ...asset,
      id: crypto.randomUUID(),
      x: asset.x + 24,
      y: asset.y + 24,
    }))
    const nextAssets = [...assets, ...duplicates]
    commitPlan(
      selectedAssetIds.length === 1 ? 'Duplicate asset' : 'Duplicate selected assets',
      {
        ...planSnapshot,
        assets: nextAssets,
      },
      `Duplicated ${selectedAssetIds.length} asset(s).`,
    )
    setSelectedAssetIds(duplicates.map((asset) => asset.id))
  }, [assets, commitPlan, planSnapshot, selectedAssetIds, setSelectedAssetIds, setStatus])

  const commitNudgeSelection = useCallback((deltaX: number, deltaY: number): void => {
    if (selectedAssetIds.length === 0) {
      return
    }
    const selectedIdSet = new Set(selectedAssetIds)
    const nextAssets = assets.map((asset) =>
      selectedIdSet.has(asset.id)
        ? {
            ...asset,
            x: snapToGrid ? snapValue(asset.x + deltaX, gridSize) : asset.x + deltaX,
            y: snapToGrid ? snapValue(asset.y + deltaY, gridSize) : asset.y + deltaY,
          }
        : asset,
    )
    commitPlan(
      selectedAssetIds.length === 1 ? 'Nudge asset' : 'Nudge selected assets',
      {
        ...planSnapshot,
        assets: nextAssets,
      },
      `Nudged ${selectedAssetIds.length} asset(s).`,
    )
  }, [assets, commitPlan, gridSize, planSnapshot, selectedAssetIds, snapToGrid])

  const onFocusConflict = useCallback((conflict: Conflict): void => {
    if (conflict.type === 'outside-parcel') {
      setSelectedAssetIds([conflict.assetId])
      setMode('move-asset')
      setStatus('Selected outside asset. Move it back inside parcel bounds.')
      return
    }
    setSelectedAssetIds(conflict.assetIds)
    setMode('move-asset')
    setStatus('Selected overlapping assets. Move one to resolve overlap.')
  }, [setMode, setSelectedAssetIds, setStatus])

  const onCanvasPointerDown = (event: ReactPointerEvent<SVGSVGElement>): void => {
    const point = getSvgPoint(event)

    if (mode === 'draw-parcel') {
      if (parcelPoints.length >= 3 && distance(parcelPoints[0], point) <= 10) {
        setStatus('Parcel closed. Switch modes to calibrate scale or place assets.')
        return
      }
      commitPlan(
        parcelPoints.length === 0 ? 'Start parcel' : 'Add parcel vertex',
        {
          ...planSnapshot,
          parcelPoints: [...parcelPoints, point],
        },
        'Point added to parcel.',
      )
      return
    }

    if (mode === 'calibrate-scale') {
      const nextDraft = calibrationDraft.length >= 2 ? [point] : [...calibrationDraft, point]
      setCalibrationDraft(nextDraft)
      setStatus(
        nextDraft.length === 2
          ? 'Enter real-world length and apply calibration.'
          : 'Calibration point 1 set. Click point 2.',
      )
      return
    }

    if (mode === 'edit-parcel') {
      for (let index = 0; index < parcelPoints.length; index += 1) {
        if (distance(parcelPoints[index], point) <= 10) {
          parcelDragSessionRef.current = {
            vertexIndex: index,
            beforeParcel: parcelPoints,
          }
          return
        }
      }
      return
    }

    if (mode === 'place-asset') {
      if (!parcelClosed) {
        setStatus('Close the parcel before placing assets.')
        return
      }
      const placementPoint = snapToGrid ? snapPoint(point, gridSize) : point
      const candidate = createAssetFromPoint(placementPoint)
      commitPlan(
        'Place asset',
        {
          ...planSnapshot,
          assets: [...assets, candidate],
        },
        `${selectedAssetType.name} placed.`,
      )
      setSelectedAssetIds([candidate.id])
      return
    }

    if (mode === 'move-asset') {
      const clickedAsset = [...assets].reverse().find((asset) => {
        const corners = getAssetCorners(asset)
        return isPointInPolygon(point, corners)
      })
      if (!clickedAsset) {
        marqueeSessionRef.current = {
          startPoint: point,
        }
        setMarqueeRect(getNormalizedRect(point, point))
        setSelectedAssetIds([])
        return
      }
      const nextSelection = setSelectionFromPointer(clickedAsset.id, event.shiftKey)
      assetDragSessionRef.current = {
        startPoint: point,
        beforeAssets: assets,
        assetIds: nextSelection.includes(clickedAsset.id) ? nextSelection : [clickedAsset.id],
      }
    }
  }

  const onRotateHandlePointerDown = (
    event: ReactPointerEvent<SVGCircleElement>,
    asset: PlacedAsset,
  ): void => {
    event.stopPropagation()
    setSelectedAssetIds([asset.id])
    const pointer = getSvgPointFromCircle(event)
    if (!pointer) {
      return
    }
    rotateSessionRef.current = {
      assetId: asset.id,
      center: { x: asset.x, y: asset.y },
      initialPointerAngle: Math.atan2(pointer.y - asset.y, pointer.x - asset.x),
      beforeAssets: assets,
    }
  }

  const onCanvasPointerMove = (event: ReactPointerEvent<SVGSVGElement>): void => {
    const point = getSvgPoint(event)

    if (parcelDragSessionRef.current) {
      const session = parcelDragSessionRef.current
      const nextParcel = [...parcelPoints]
      nextParcel[session.vertexIndex] = point
      setParcelPoints(nextParcel)
      return
    }

    if (assetDragSessionRef.current) {
      const session = assetDragSessionRef.current
      const deltaX = point.x - session.startPoint.x
      const deltaY = point.y - session.startPoint.y
      const draggedIds = new Set(session.assetIds)
      const movedAssets = session.beforeAssets.map((asset) =>
        draggedIds.has(asset.id)
          ? {
              ...asset,
              x: snapToGrid ? snapValue(asset.x + deltaX, gridSize) : asset.x + deltaX,
              y: snapToGrid ? snapValue(asset.y + deltaY, gridSize) : asset.y + deltaY,
            }
          : asset,
      )
      setAssets(movedAssets)
      return
    }

    if (marqueeSessionRef.current) {
      const rect = getNormalizedRect(marqueeSessionRef.current.startPoint, point)
      setMarqueeRect(rect)
      const selection = assets
        .filter((asset) => {
          const center = { x: asset.x, y: asset.y }
          if (pointInRect(center, rect)) {
            return true
          }
          const corners = getAssetCorners(asset)
          return corners.some((corner) => pointInRect(corner, rect))
        })
        .map((asset) => asset.id)
      setSelectedAssetIds(selection)
      return
    }

    if (rotateSessionRef.current) {
      const session = rotateSessionRef.current
      const angle = Math.atan2(point.y - session.center.y, point.x - session.center.x)
      const deltaDegreesRaw = ((angle - session.initialPointerAngle) * 180) / Math.PI
      const deltaDegrees = event.shiftKey ? Math.round(deltaDegreesRaw / 15) * 15 : deltaDegreesRaw
      const nextAssets = session.beforeAssets.map((asset) =>
        asset.id === session.assetId
          ? {
              ...asset,
              rotationDeg: normalizeDegrees(asset.rotationDeg + deltaDegrees),
            }
          : asset,
      )
      setAssets(nextAssets)
    }
  }

  const onCanvasPointerUp = (): void => {
    if (parcelDragSessionRef.current) {
      const session = parcelDragSessionRef.current
      const previousSnapshot: PlanSnapshot = {
        ...planSnapshot,
        parcelPoints: session.beforeParcel,
      }
      const nextSnapshot: PlanSnapshot = {
        ...planSnapshot,
        parcelPoints,
      }
      if (session.beforeParcel !== parcelPoints) {
        commitPlan('Move parcel vertex', nextSnapshot, 'Parcel vertex moved.', previousSnapshot)
      }
      parcelDragSessionRef.current = null
      return
    }

    if (assetDragSessionRef.current) {
      const session = assetDragSessionRef.current
      const previousSnapshot: PlanSnapshot = {
        ...planSnapshot,
        assets: session.beforeAssets,
      }
      const nextSnapshot: PlanSnapshot = {
        ...planSnapshot,
        assets,
      }
      if (!assetsEqual(session.beforeAssets, assets)) {
        commitPlan(
          session.assetIds.length === 1 ? 'Move asset' : 'Move selected assets',
          nextSnapshot,
          `Moved ${session.assetIds.length} asset(s).`,
          previousSnapshot,
        )
      }
      assetDragSessionRef.current = null
      return
    }

    if (marqueeSessionRef.current) {
      marqueeSessionRef.current = null
      setMarqueeRect(null)
      return
    }

    if (rotateSessionRef.current) {
      const session = rotateSessionRef.current
      const previousSnapshot: PlanSnapshot = {
        ...planSnapshot,
        assets: session.beforeAssets,
      }
      const nextSnapshot: PlanSnapshot = {
        ...planSnapshot,
        assets,
      }
      if (!assetsEqual(session.beforeAssets, assets)) {
        commitPlan('Rotate asset handle', nextSnapshot, 'Asset rotated.', previousSnapshot)
      }
      rotateSessionRef.current = null
    }
  }

  const onApplyCalibration = (): void => {
    const feet = Number(calibrationFeetInput)
    if (calibrationDraft.length !== 2 || Number.isNaN(feet) || feet <= 0) {
      setStatus('Calibration requires two points and a positive real-world length.')
      return
    }
    const nextCalibration = {
      firstPoint: calibrationDraft[0],
      secondPoint: calibrationDraft[1],
      realWorldFeet: feet,
    }
    commitPlan(
      'Apply calibration',
      {
        ...planSnapshot,
        calibration: nextCalibration,
      },
      `Calibration applied: ${formatFeet(feet)} for selected line.`,
    )
    setCalibrationDraft([])
  }

  const onResetCalibration = (): void => {
    if (!calibration) {
      setStatus('No calibration to clear.')
      return
    }
    commitPlan(
      'Reset calibration',
      {
        ...planSnapshot,
        calibration: null,
      },
      'Calibration cleared.',
    )
    setCalibrationDraft([])
  }

  const onCreateTourStop = (): void => {
    if (assets.length === 0) {
      setStatus('Place at least one asset before creating tour stops.')
      return
    }
    const focus = assets[assets.length - 1]
    const stop: TourStop = {
      id: crypto.randomUUID(),
      orderIndex: tourStops.length,
      title: `Stop ${tourStops.length + 1}`,
      camera: {
        position: { x: focus.x + 240, y: 210, z: focus.y + 240 },
        target: { x: focus.x, y: 0, z: focus.y },
      },
    }
    setTourStops([...tourStops, stop])
    setActiveTourStopId(stop.id)
    setStatus('Tour stop captured.')
  }

  const onMoveTourStop = (id: string, direction: -1 | 1): void => {
    const ordered = sortTourStops(tourStops)
    const index = ordered.findIndex((stop) => stop.id === id)
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
      return
    }
    const swapped = [...ordered]
    ;[swapped[index], swapped[targetIndex]] = [swapped[targetIndex], swapped[index]]
    setTourStops(swapped.map((stop, itemIndex) => ({ ...stop, orderIndex: itemIndex })))
  }

  const onPlayTour = (): void => {
    if (sortedTourStops.length === 0) {
      setStatus('No tour stops available.')
      return
    }
    let index = 0
    setActiveTourStopId(sortedTourStops[index].id)
    const timer = window.setInterval(() => {
      index += 1
      if (index >= sortedTourStops.length) {
        window.clearInterval(timer)
        return
      }
      setActiveTourStopId(sortedTourStops[index].id)
    }, 1800)
  }

  const onExportProject = (): void => {
    if (!previewReady) {
      setStatus('Resolve conflicts before exporting project JSON.')
      return
    }
    const project: ProjectDocument = {
      version: 1,
      title: projectTitle,
      units: 'feet',
      parcelPoints,
      assets,
      calibration,
      tourStops: sortedTourStops,
    }
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'project.json'
    link.click()
    URL.revokeObjectURL(link.href)
    setStatus('Project JSON exported.')
  }

  const onImportProject = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    const content = await file.text()
    const imported = parseStoredProject(content)
    if (!imported) {
      setStatus('Import failed: invalid project JSON.')
      return
    }
    initializeFromProject(imported)
    setStatus('Project imported successfully.')
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable
      ) {
        return
      }

      const modifier = event.metaKey || event.ctrlKey

      if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          redo()
        } else {
          undo()
        }
        return
      }

      if (modifier && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        commitDuplicateSelection()
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        commitDeleteSelection()
        return
      }

      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault()
        commitRotateSelection(-1, true)
        return
      }

      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault()
        commitRotateSelection(1, true)
        return
      }

      if (!event.altKey && event.key.startsWith('Arrow')) {
        event.preventDefault()
        const step = event.shiftKey ? 10 : 2
        if (event.key === 'ArrowLeft') {
          commitNudgeSelection(-step, 0)
          return
        }
        if (event.key === 'ArrowRight') {
          commitNudgeSelection(step, 0)
          return
        }
        if (event.key === 'ArrowUp') {
          commitNudgeSelection(0, -step)
          return
        }
        if (event.key === 'ArrowDown') {
          commitNudgeSelection(0, step)
        }
      }

      if (event.key.toLowerCase() === 'g' && !modifier) {
        event.preventDefault()
        setSnapToGrid((current) => {
          const next = !current
          setStatus(next ? `Grid snap on (${gridSize}px)` : 'Grid snap off.')
          return next
        })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [commitDeleteSelection, commitDuplicateSelection, commitNudgeSelection, commitRotateSelection, gridSize, redo, setStatus, undo])

  const undoLabel = undoStack.length > 0 ? undoStack[undoStack.length - 1].description : 'Undo'
  const redoLabel = redoStack.length > 0 ? redoStack[redoStack.length - 1].description : 'Redo'

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="header-main-row">
          <input
            className="project-title"
            value={projectTitle}
            onChange={(event) => setProjectTitle(event.target.value)}
            aria-label="Project title"
          />
          <nav className="tabs" aria-label="Project sections">
            {(['plan', 'preview', 'tour', 'share'] as TabId[]).map((tabId) => (
              <button
                type="button"
                key={tabId}
                onClick={() => setTabWithReadinessCheck(tabId)}
                data-active={activeTab === tabId}
              >
                {tabId === 'plan' && 'Plan'}
                {tabId === 'preview' && '3D Preview'}
                {tabId === 'tour' && 'Tour'}
                {tabId === 'share' && 'Share'}
              </button>
            ))}
          </nav>
          <div className="history-controls" aria-label="History controls">
            <button type="button" onClick={undo} disabled={undoStack.length === 0}>
              Undo ({undoLabel})
            </button>
            <button type="button" onClick={redo} disabled={redoStack.length === 0}>
              Redo ({redoLabel})
            </button>
          </div>
        </div>
        <p className="shortcut-hint">
          Shortcuts: Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z, Cmd/Ctrl+D, Delete, Alt+←/→ rotate, ←↑→↓ nudge (Shift = 10)
        </p>
      </header>

      {activeTab === 'plan' && (
        <section className="layout">
          <aside className="panel">
            <h1>2D Plan Workspace</h1>
            <p className="lede">Draw, calibrate, place, rotate, and manage assets with full undo history.</p>

            <section className="control-group">
              <h2>Tools</h2>
              <div className="button-row">
                <button type="button" onClick={() => setMode('draw-parcel')} data-active={mode === 'draw-parcel'}>
                  Draw Parcel
                </button>
                <button type="button" onClick={() => setMode('edit-parcel')} data-active={mode === 'edit-parcel'}>
                  Edit Parcel
                </button>
                <button
                  type="button"
                  onClick={() => setMode('calibrate-scale')}
                  data-active={mode === 'calibrate-scale'}
                >
                  Calibrate
                </button>
                <button
                  type="button"
                  onClick={() => setMode('place-asset')}
                  data-active={mode === 'place-asset'}
                >
                  Place Asset
                </button>
                <button type="button" onClick={() => setMode('move-asset')} data-active={mode === 'move-asset'}>
                  Move/Select
                </button>
              </div>
              <div className="snap-controls">
                <label className="checkbox-label" htmlFor="snap-to-grid-toggle">
                  <input
                    id="snap-to-grid-toggle"
                    type="checkbox"
                    checked={snapToGrid}
                    onChange={(event) => setSnapToGrid(event.target.checked)}
                  />
                  Snap to grid
                </label>
                <label htmlFor="grid-size">Grid (canvas units)</label>
                <input
                  id="grid-size"
                  type="number"
                  min="4"
                  max="64"
                  step="2"
                  value={gridSize}
                  onChange={(event) => {
                    const next = Number(event.target.value)
                    if (Number.isNaN(next)) {
                      return
                    }
                    setGridSize(Math.max(4, Math.min(64, next)))
                  }}
                />
              </div>
            </section>

            <section className="control-group">
              <h2>Scale</h2>
              <p>Current scale: 1 world unit = {formatFeet(feetPerUnit)}</p>
              <label htmlFor="real-world-feet">Calibration line length (ft)</label>
              <input
                id="real-world-feet"
                type="number"
                min="1"
                step="1"
                value={calibrationFeetInput}
                onChange={(event) => setCalibrationFeetInput(event.target.value)}
              />
              <div className="button-row">
                <button type="button" onClick={onApplyCalibration}>
                  Apply Calibration
                </button>
                <button type="button" onClick={onResetCalibration}>
                  Reset Calibration
                </button>
              </div>
            </section>

            <section className="control-group">
              <h2>Asset Library</h2>
              <label htmlFor="asset-type">Asset type</label>
              <select
                id="asset-type"
                value={selectedAssetType.id}
                onChange={(event) => setSelectedAssetTypeId(event.target.value)}
              >
                {ASSET_TYPES.map((assetType) => (
                  <option key={assetType.id} value={assetType.id}>
                    {assetType.name} ({assetType.widthFt}x{assetType.heightFt} ft)
                  </option>
                ))}
              </select>
              <p>{assets.length} assets placed</p>
              <p>{selectedAssetIds.length} selected</p>
            </section>

            <section className="control-group">
              <h2>Selection Actions</h2>
              <div className="button-row">
                <button type="button" onClick={() => commitRotateSelection(-15)}>
                  Rotate -15°
                </button>
                <button type="button" onClick={() => commitRotateSelection(15)}>
                  Rotate +15°
                </button>
                <button type="button" onClick={() => commitRotateSelection(-1, true)}>
                  Fine -1°
                </button>
                <button type="button" onClick={() => commitRotateSelection(1, true)}>
                  Fine +1°
                </button>
                <button type="button" onClick={commitDuplicateSelection}>
                  Duplicate
                </button>
                <button type="button" onClick={commitDeleteSelection}>
                  Delete
                </button>
              </div>
            </section>

            <section className="control-group">
              <h2>Readiness</h2>
              {conflicts.length === 0 ? (
                <p className="status-ok">Ready for preview/export.</p>
              ) : (
                <>
                  <p className="status-warning">{conflicts.length} conflict(s) to resolve.</p>
                  <ul className="conflict-list">
                    {conflicts.slice(0, 6).map((conflict) => (
                      <li key={conflict.id} className="conflict-item">
                        <span>{conflict.message}</span>
                        <button type="button" onClick={() => onFocusConflict(conflict)}>
                          Select
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <p className="status">{status}</p>
          </aside>

          <section className="canvas-wrap">
            <div className="canvas-toolbar" aria-label="Canvas actions">
              <button type="button" onClick={undo} disabled={undoStack.length === 0}>
                Undo
              </button>
              <button type="button" onClick={redo} disabled={redoStack.length === 0}>
                Redo
              </button>
              <button type="button" onClick={commitDuplicateSelection}>
                Duplicate
              </button>
              <button type="button" onClick={commitDeleteSelection}>
                Delete
              </button>
            </div>

            <svg
              className="editor-canvas"
              role="img"
              aria-label="2D plan editor canvas"
              viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
              onPointerDown={onCanvasPointerDown}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={onCanvasPointerUp}
              onPointerLeave={onCanvasPointerUp}
            >
              <rect x="0" y="0" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="canvas-bg" />

              {parcelPoints.length >= 2 && (
                <polyline
                  className="parcel-outline"
                  points={parcelPoints.map((point) => `${point.x},${point.y}`).join(' ')}
                />
              )}

              {parcelClosed && (
                <polygon
                  className="parcel-fill"
                  points={parcelPoints.map((point) => `${point.x},${point.y}`).join(' ')}
                />
              )}

              {measurementLabels.map((label) => (
                <g key={label.id}>
                  <rect x={label.x - 34} y={label.y - 12} width="68" height="18" className="measure-label-bg" />
                  <text x={label.x} y={label.y + 1} className="measure-label">
                    {label.text}
                  </text>
                </g>
              ))}

              {assets.map((asset) => {
                const corners = getAssetCorners(asset)
                const assetType = getAssetType(asset.typeId)
                const selected = selectedAssetSet.has(asset.id)
                const handleOffset = asset.height / 2 + 24
                const angleRad = (asset.rotationDeg * Math.PI) / 180
                const handlePosition = {
                  x: asset.x + handleOffset * Math.sin(angleRad),
                  y: asset.y - handleOffset * Math.cos(angleRad),
                }
                return (
                  <g key={asset.id}>
                    <polygon
                      className="asset-shape"
                      data-selected={selected}
                      points={corners.map((corner) => `${corner.x},${corner.y}`).join(' ')}
                      fill={assetType.color}
                    />
                    <text x={asset.x} y={asset.y - 6} className="asset-label">
                      {assetType.name}
                    </text>
                    <text x={asset.x} y={asset.y + 10} className="asset-measure">
                      {formatFeet(asset.width * feetPerUnit)} x {formatFeet(asset.height * feetPerUnit)}
                    </text>
                    {selected && (
                      <>
                        <line
                          className="rotate-handle-link"
                          x1={asset.x}
                          y1={asset.y}
                          x2={handlePosition.x}
                          y2={handlePosition.y}
                        />
                        <circle
                          className="rotate-handle"
                          cx={handlePosition.x}
                          cy={handlePosition.y}
                          r={8}
                          onPointerDown={(event) => onRotateHandlePointerDown(event, asset)}
                        />
                      </>
                    )}
                  </g>
                )
              })}

              {parcelPoints.map((point, index) => (
                <circle key={`${point.x}-${point.y}-${index}`} className="vertex" cx={point.x} cy={point.y} r={5} />
              ))}

              {calibrationDraft.length > 0 && (
                <g>
                  <circle className="calibration-point" cx={calibrationDraft[0].x} cy={calibrationDraft[0].y} r={6} />
                  {calibrationDraft[1] && (
                    <>
                      <circle className="calibration-point" cx={calibrationDraft[1].x} cy={calibrationDraft[1].y} r={6} />
                      <line
                        className="calibration-line"
                        x1={calibrationDraft[0].x}
                        y1={calibrationDraft[0].y}
                        x2={calibrationDraft[1].x}
                        y2={calibrationDraft[1].y}
                      />
                    </>
                  )}
                </g>
              )}

              {marqueeRect && mode === 'move-asset' && (
                <rect
                  className="marquee-selection"
                  x={marqueeRect.minX}
                  y={marqueeRect.minY}
                  width={marqueeRect.maxX - marqueeRect.minX}
                  height={marqueeRect.maxY - marqueeRect.minY}
                />
              )}
            </svg>
          </section>
        </section>
      )}

      {activeTab === 'preview' && (
        <section className="phase-panel">
          <h2>3D Preview</h2>
          <p>Babylon.js scene mirrors parcel and placed assets from the 2D plan.</p>
          <label htmlFor="environment">Environment preset</label>
          <select
            id="environment"
            value={environmentPreset}
            onChange={(event) => setEnvironmentPreset(event.target.value as 'day' | 'dusk')}
          >
            <option value="day">Day</option>
            <option value="dusk">Dusk</option>
          </select>
          <BabylonPreview
            parcelPoints={parcelPoints}
            assets={assets}
            environment={environmentPreset}
            activeTourStop={activeTourStop}
          />
        </section>
      )}

      {activeTab === 'tour' && (
        <section className="phase-panel">
          <h2>Tour Authoring</h2>
          <p>Create stops and play them back in the 3D Preview tab.</p>
          <div className="button-row">
            <button type="button" onClick={onCreateTourStop}>
              Capture Stop
            </button>
            <button type="button" onClick={onPlayTour}>
              Play Tour
            </button>
          </div>
          <div className="tour-list">
            {sortedTourStops.map((stop) => (
              <div key={stop.id} className="tour-row">
                <button type="button" onClick={() => setActiveTourStopId(stop.id)}>
                  {stop.title}
                </button>
                <button type="button" onClick={() => onMoveTourStop(stop.id, -1)}>
                  ↑
                </button>
                <button type="button" onClick={() => onMoveTourStop(stop.id, 1)}>
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTourStops(
                      tourStops
                        .filter((candidate) => candidate.id !== stop.id)
                        .map((candidate, index) => ({ ...candidate, orderIndex: index })),
                    )
                  }
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'share' && (
        <section className="phase-panel">
          <h2>Share</h2>
          <p>Export/import project JSON locally. Preview/export is blocked while conflicts remain.</p>
          <div className="button-row">
            <button type="button" onClick={onExportProject}>
              Export project.json
            </button>
            <label className="file-label">
              Import project.json
              <input type="file" accept="application/json" onChange={onImportProject} />
            </label>
            <button type="button" onClick={() => setShareToken(crypto.randomUUID().slice(0, 10))}>
              Generate share token
            </button>
          </div>
          {shareToken && <p>Share token: {shareToken}</p>}
        </section>
      )}
    </main>
  )
}

export default App
