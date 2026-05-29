import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useState } from 'react'
import { BabylonPreview } from './BabylonPreview'
import {
  distance,
  getAssetCorners,
  isAssetInsideParcel,
  midpoint,
  overlapsAnyAsset,
} from './geometry'
import './App.css'
import type {
  AssetType,
  EditorMode,
  PlacedAsset,
  Point,
  ProjectDocument,
  ScaleCalibration,
  TourStop,
} from './types'

type TabId = 'plan' | 'preview' | 'tour' | 'share'

const STORAGE_KEY = 'gunter-project-v1'
const CANVAS_WIDTH = 1000
const CANVAS_HEIGHT = 640
const DEFAULT_FEET_PER_WORLD_UNIT = 1

const ASSET_TYPES: AssetType[] = [
  { id: 'field-180', name: "Field 180'", widthFt: 180, heightFt: 180, color: '#3182ce' },
  { id: 'field-220', name: "Field 220'", widthFt: 220, heightFt: 220, color: '#2b6cb0' },
  { id: 'concessions', name: 'Concessions', widthFt: 56, heightFt: 40, color: '#dd6b20' },
  { id: 'parking', name: 'Parking Module', widthFt: 120, heightFt: 80, color: '#4a5568' },
  { id: 'batting-cages', name: 'Batting Cages', widthFt: 90, heightFt: 32, color: '#805ad5' },
  { id: 'lighting', name: 'Lighting Cluster', widthFt: 24, heightFt: 24, color: '#d69e2e' },
]

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

function getSvgPoint(event: ReactPointerEvent<SVGSVGElement>): Point {
  const rect = event.currentTarget.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH
  const y = ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT
  return { x, y }
}

function sortTourStops(stops: TourStop[]): TourStop[] {
  return [...stops].sort((a, b) => a.orderIndex - b.orderIndex)
}

function App() {
  const [initialProject] = useState<ProjectDocument | null>(() => loadInitialProject())
  const [activeTab, setActiveTab] = useState<TabId>('plan')
  const [mode, setMode] = useState<EditorMode>('draw-parcel')
  const [parcelPoints, setParcelPoints] = useState<Point[]>(initialProject?.parcelPoints ?? [])
  const [assets, setAssets] = useState<PlacedAsset[]>(initialProject?.assets ?? [])
  const [selectedAssetTypeId, setSelectedAssetTypeId] = useState<string>(ASSET_TYPES[0].id)
  const [calibration, setCalibration] = useState<ScaleCalibration | null>(initialProject?.calibration ?? null)
  const [calibrationDraft, setCalibrationDraft] = useState<Point[]>([])
  const [calibrationFeetInput, setCalibrationFeetInput] = useState<string>('180')
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null)
  const [draggingAssetId, setDraggingAssetId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>(
    initialProject
      ? 'Project restored from local storage.'
      : 'Draw a parcel by clicking points on the canvas.',
  )
  const [tourStops, setTourStops] = useState<TourStop[]>(
    initialProject ? sortTourStops(initialProject.tourStops) : [],
  )
  const [activeTourStopId, setActiveTourStopId] = useState<string | null>(null)
  const [environmentPreset, setEnvironmentPreset] = useState<'day' | 'dusk'>('day')
  const [shareToken, setShareToken] = useState<string>('')
  const [projectTitle, setProjectTitle] = useState<string>(
    initialProject?.title ?? 'Baseball Complex Plan',
  )

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

  const feetPerUnit = useMemo(() => feetPerWorldUnit(calibration), [calibration])
  const selectedAssetType = useMemo(
    () => ASSET_TYPES.find((assetType) => assetType.id === selectedAssetTypeId) ?? ASSET_TYPES[0],
    [selectedAssetTypeId],
  )

  const parcelClosed = parcelPoints.length >= 3
  const canPlaceAssets = parcelClosed
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

  const isValidAssetPlacement = (candidate: PlacedAsset): boolean => {
    if (!parcelClosed) {
      return false
    }
    if (!isAssetInsideParcel(candidate, parcelPoints)) {
      return false
    }
    return !overlapsAnyAsset(candidate, assets)
  }

  const onCanvasPointerDown = (event: ReactPointerEvent<SVGSVGElement>): void => {
    const point = getSvgPoint(event)
    if (mode === 'draw-parcel') {
      if (parcelPoints.length >= 3 && distance(parcelPoints[0], point) <= 10) {
        setStatus('Parcel closed. Switch modes to calibrate scale or place assets.')
        return
      }
      setParcelPoints((previous) => [...previous, point])
      setStatus('Point added to parcel.')
      return
    }
    if (mode === 'calibrate-scale') {
      setCalibrationDraft((previous) => {
        const next = previous.length >= 2 ? [point] : [...previous, point]
        setStatus(
          next.length === 2
            ? 'Enter real-world length and apply calibration.'
            : 'Calibration point 1 set. Click point 2.',
        )
        return next
      })
      return
    }
    if (mode === 'place-asset') {
      if (!canPlaceAssets) {
        setStatus('Close the parcel before placing assets.')
        return
      }
      const candidate = createAssetFromPoint(point)
      if (!isValidAssetPlacement(candidate)) {
        setStatus('Placement blocked: asset must stay inside parcel and avoid overlap.')
        return
      }
      setAssets((previous) => [...previous, candidate])
      setStatus(`${selectedAssetType.name} placed.`)
    }
  }

  const onCanvasPointerMove = (event: ReactPointerEvent<SVGSVGElement>): void => {
    const point = getSvgPoint(event)
    if (draggingVertexIndex !== null) {
      setParcelPoints((previous) => {
        const next = [...previous]
        next[draggingVertexIndex] = point
        return next
      })
      return
    }
    if (draggingAssetId !== null) {
      setAssets((previous) =>
        previous.map((asset) => {
          if (asset.id !== draggingAssetId) {
            return asset
          }
          const candidate = { ...asset, x: point.x, y: point.y }
          return isValidAssetPlacement(candidate) ? candidate : asset
        }),
      )
    }
  }

  const onCanvasPointerUp = (): void => {
    setDraggingVertexIndex(null)
    setDraggingAssetId(null)
  }

  const onApplyCalibration = (): void => {
    const feet = Number(calibrationFeetInput)
    if (calibrationDraft.length !== 2 || Number.isNaN(feet) || feet <= 0) {
      setStatus('Calibration requires two points and a positive real-world length.')
      return
    }
    setCalibration({
      firstPoint: calibrationDraft[0],
      secondPoint: calibrationDraft[1],
      realWorldFeet: feet,
    })
    setStatus(`Calibration applied: ${formatFeet(feet)} for selected line.`)
  }

  const onRotateAsset = (assetId: string, deltaDegrees: number): void => {
    setAssets((previous) =>
      previous.map((asset) => {
        if (asset.id !== assetId) {
          return asset
        }
        const candidate = { ...asset, rotationDeg: asset.rotationDeg + deltaDegrees }
        return isValidAssetPlacement(candidate) ? candidate : asset
      }),
    )
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
    setTourStops((previous) => [...previous, stop])
    setActiveTourStopId(stop.id)
    setStatus('Tour stop captured.')
  }

  const onMoveTourStop = (id: string, direction: -1 | 1): void => {
    setTourStops((previous) => {
      const ordered = sortTourStops(previous)
      const index = ordered.findIndex((stop) => stop.id === id)
      const targetIndex = index + direction
      if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
        return previous
      }
      const swapped = [...ordered]
      ;[swapped[index], swapped[targetIndex]] = [swapped[targetIndex], swapped[index]]
      return swapped.map((stop, itemIndex) => ({ ...stop, orderIndex: itemIndex }))
    })
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

  const onImportProject = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
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
    setProjectTitle(imported.title)
    setParcelPoints(imported.parcelPoints)
    setAssets(imported.assets)
    setCalibration(imported.calibration)
    setTourStops(sortTourStops(imported.tourStops))
    setActiveTourStopId(null)
    setStatus('Project imported successfully.')
  }

  return (
    <main className="app-shell">
      <header className="app-header">
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
              onClick={() => setActiveTab(tabId)}
              data-active={activeTab === tabId}
            >
              {tabId === 'plan' && 'Phase 1 Plan'}
              {tabId === 'preview' && 'Phase 3 Preview'}
              {tabId === 'tour' && 'Phase 4 Tour'}
              {tabId === 'share' && 'Phase 5 Share'}
            </button>
          ))}
        </nav>
      </header>

      {activeTab === 'plan' && (
        <section className="layout">
          <aside className="panel">
            <h1>2D Plan Editor</h1>
            <p className="lede">
              Phase 1 + Phase 2: parcel draw/edit, calibration, placement constraints, and asset
              library.
            </p>
            <section className="control-group">
              <h2>Mode</h2>
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
                  Move Asset
                </button>
              </div>
            </section>

            <section className="control-group">
              <h2>Scale calibration</h2>
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
              <button type="button" onClick={onApplyCalibration}>
                Apply Calibration
              </button>
            </section>

            <section className="control-group">
              <h2>Asset library (Phase 2)</h2>
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
            </section>

            <p className="status">{status}</p>
          </aside>

          <section className="canvas-wrap">
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
                const assetType = ASSET_TYPES.find((item) => item.id === asset.typeId) ?? ASSET_TYPES[0]
                return (
                  <g key={asset.id}>
                    <polygon
                      className="asset-shape"
                      points={corners.map((corner) => `${corner.x},${corner.y}`).join(' ')}
                      fill={assetType.color}
                      onPointerDown={(event) => {
                        if (mode === 'move-asset') {
                          event.stopPropagation()
                          setDraggingAssetId(asset.id)
                        }
                      }}
                    />
                    <text x={asset.x} y={asset.y - 6} className="asset-label">
                      {assetType.name}
                    </text>
                    <text x={asset.x} y={asset.y + 10} className="asset-measure">
                      {formatFeet(asset.width * feetPerUnit)} x {formatFeet(asset.height * feetPerUnit)}
                    </text>
                  </g>
                )
              })}

              {parcelPoints.map((point, index) => (
                <circle
                  key={`${point.x}-${point.y}-${index}`}
                  className="vertex"
                  cx={point.x}
                  cy={point.y}
                  r={5}
                  onPointerDown={(event) => {
                    if (mode === 'edit-parcel') {
                      event.stopPropagation()
                      setDraggingVertexIndex(index)
                    }
                  }}
                />
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
            </svg>

            <div className="asset-actions">
              {assets.map((asset) => (
                <div key={asset.id} className="asset-action-row">
                  <span>{ASSET_TYPES.find((assetType) => assetType.id === asset.typeId)?.name}</span>
                  <button type="button" onClick={() => onRotateAsset(asset.id, -15)}>
                    Rotate -15°
                  </button>
                  <button type="button" onClick={() => onRotateAsset(asset.id, 15)}>
                    Rotate +15°
                  </button>
                </div>
              ))}
            </div>
          </section>
        </section>
      )}

      {activeTab === 'preview' && (
        <section className="phase-panel">
          <h2>3D Preview (Phase 3)</h2>
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
          <h2>Tour authoring (Phase 4)</h2>
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
                    setTourStops((previous) =>
                      previous
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
          <h2>Sharing (Phase 5)</h2>
          <p>Export/import project JSON today. Tokenized sharing is stubbed with a local token.</p>
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
