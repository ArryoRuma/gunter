import { useEffect, useRef } from 'react'
import type { PlacedAsset, Point, TourStop } from './types'

type BabylonCore = typeof import('@babylonjs/core')

type AssetMeshMetadata = {
  width: number
  height: number
}

type PreviewScene = {
  babylon: BabylonCore
  engine: import('@babylonjs/core').Engine
  scene: import('@babylonjs/core').Scene
  camera: import('@babylonjs/core').ArcRotateCamera
  light: import('@babylonjs/core').HemisphericLight
  groundMaterial: import('@babylonjs/core').StandardMaterial
  parcelOutline: import('@babylonjs/core').LinesMesh | null
  assetMeshes: Map<string, import('@babylonjs/core').Mesh>
  resizeHandler: () => void
}

function applyEnvironment(sceneContext: PreviewScene, environment: 'day' | 'dusk'): void {
  const { babylon, scene, light, groundMaterial } = sceneContext
  light.intensity = environment === 'day' ? 0.95 : 0.5
  scene.clearColor =
    environment === 'day'
      ? new babylon.Color4(0.73, 0.84, 0.95, 1)
      : new babylon.Color4(0.08, 0.1, 0.2, 1)
  groundMaterial.diffuseColor =
    environment === 'day'
      ? new babylon.Color3(0.17, 0.56, 0.24)
      : new babylon.Color3(0.1, 0.25, 0.14)
}

function syncParcelOutline(sceneContext: PreviewScene, parcelPoints: Point[]): void {
  const { babylon, scene } = sceneContext

  if (parcelPoints.length < 3) {
    if (sceneContext.parcelOutline) {
      sceneContext.parcelOutline.dispose()
      sceneContext.parcelOutline = null
    }
    return
  }

  const parcelLinePoints = [...parcelPoints, parcelPoints[0]].map(
    (point) => new babylon.Vector3(point.x, 2, point.y),
  )

  if (sceneContext.parcelOutline) {
    sceneContext.parcelOutline = babylon.MeshBuilder.CreateLines(
      'parcel-outline',
      {
        points: parcelLinePoints,
        instance: sceneContext.parcelOutline,
      },
      scene,
    )
  } else {
    sceneContext.parcelOutline = babylon.MeshBuilder.CreateLines(
      'parcel-outline',
      { points: parcelLinePoints },
      scene,
    )
  }

  sceneContext.parcelOutline.color = babylon.Color3.White()
}

function createAssetMesh(sceneContext: PreviewScene, asset: PlacedAsset): import('@babylonjs/core').Mesh {
  const { babylon, scene } = sceneContext
  const mesh = babylon.MeshBuilder.CreateBox(
    `asset-${asset.id}`,
    { width: asset.width, depth: asset.height, height: 18 },
    scene,
  )
  mesh.position = new babylon.Vector3(asset.x, 9, asset.y)
  mesh.rotation.y = (asset.rotationDeg * Math.PI) / 180
  mesh.metadata = {
    width: asset.width,
    height: asset.height,
  } satisfies AssetMeshMetadata

  const material = new babylon.StandardMaterial(`asset-material-${asset.id}`, scene)
  material.diffuseColor = new babylon.Color3(0.2, 0.5, 0.8)
  mesh.material = material
  return mesh
}

function syncAssets(sceneContext: PreviewScene, assets: PlacedAsset[]): void {
  const nextAssetIds = new Set(assets.map((asset) => asset.id))

  for (const [assetId, mesh] of sceneContext.assetMeshes.entries()) {
    if (!nextAssetIds.has(assetId)) {
      mesh.dispose()
      sceneContext.assetMeshes.delete(assetId)
    }
  }

  for (const asset of assets) {
    const existingMesh = sceneContext.assetMeshes.get(asset.id)
    if (!existingMesh) {
      sceneContext.assetMeshes.set(asset.id, createAssetMesh(sceneContext, asset))
      continue
    }

    const metadata = (existingMesh.metadata ?? null) as AssetMeshMetadata | null
    const dimensionChanged =
      !metadata || metadata.width !== asset.width || metadata.height !== asset.height

    if (dimensionChanged) {
      existingMesh.dispose()
      sceneContext.assetMeshes.set(asset.id, createAssetMesh(sceneContext, asset))
      continue
    }

    existingMesh.position.x = asset.x
    existingMesh.position.y = 9
    existingMesh.position.z = asset.y
    existingMesh.rotation.y = (asset.rotationDeg * Math.PI) / 180
  }
}

function applyActiveTourStop(sceneContext: PreviewScene, activeTourStop: TourStop | null): void {
  if (!activeTourStop) {
    return
  }

  const { babylon, camera } = sceneContext
  camera.setPosition(
    new babylon.Vector3(
      activeTourStop.camera.position.x,
      activeTourStop.camera.position.y,
      activeTourStop.camera.position.z,
    ),
  )
  camera.setTarget(
    new babylon.Vector3(
      activeTourStop.camera.target.x,
      activeTourStop.camera.target.y,
      activeTourStop.camera.target.z,
    ),
  )
}

interface BabylonPreviewProps {
  parcelPoints: Point[]
  assets: PlacedAsset[]
  environment: 'day' | 'dusk'
  activeTourStop: TourStop | null
}

export function BabylonPreview({
  parcelPoints,
  assets,
  environment,
  activeTourStop,
}: BabylonPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sceneRef = useRef<PreviewScene | null>(null)
  const latestPropsRef = useRef({ parcelPoints, assets, environment, activeTourStop })

  useEffect(() => {
    latestPropsRef.current = { parcelPoints, assets, environment, activeTourStop }
  }, [activeTourStop, assets, environment, parcelPoints])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    let cancelled = false

    void (async () => {
      const babylon = await import('@babylonjs/core')
      if (cancelled || sceneRef.current) {
        return
      }

      const engine = new babylon.Engine(canvas, true)
      const scene = new babylon.Scene(engine)
      const camera = new babylon.ArcRotateCamera(
        'camera',
        Math.PI / 3,
        Math.PI / 3,
        1300,
        new babylon.Vector3(500, 0, 320),
        scene,
      )
      camera.attachControl(canvas, true)
      camera.lowerRadiusLimit = 300
      camera.upperRadiusLimit = 4000

      const light = new babylon.HemisphericLight('light', new babylon.Vector3(0, 1, 0), scene)

      const ground = babylon.MeshBuilder.CreateGround(
        'ground',
        {
          width: 2400,
          height: 1800,
        },
        scene,
      )
      const groundMaterial = new babylon.StandardMaterial('ground-material', scene)
      ground.material = groundMaterial

      engine.runRenderLoop(() => scene.render())
      const onResize = () => engine.resize()
      window.addEventListener('resize', onResize)

      const sceneContext: PreviewScene = {
        babylon,
        engine,
        scene,
        camera,
        light,
        groundMaterial,
        parcelOutline: null,
        assetMeshes: new Map(),
        resizeHandler: onResize,
      }

      sceneRef.current = sceneContext

      const latestProps = latestPropsRef.current
      applyEnvironment(sceneContext, latestProps.environment)
      syncParcelOutline(sceneContext, latestProps.parcelPoints)
      syncAssets(sceneContext, latestProps.assets)
      applyActiveTourStop(sceneContext, latestProps.activeTourStop)
    })()

    return () => {
      cancelled = true
      const sceneContext = sceneRef.current
      if (!sceneContext) {
        return
      }
      window.removeEventListener('resize', sceneContext.resizeHandler)
      sceneContext.scene.dispose()
      sceneContext.engine.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    const sceneContext = sceneRef.current
    if (!sceneContext) {
      return
    }
    applyEnvironment(sceneContext, environment)
  }, [environment])

  useEffect(() => {
    const sceneContext = sceneRef.current
    if (!sceneContext) {
      return
    }
    syncParcelOutline(sceneContext, parcelPoints)
  }, [parcelPoints])

  useEffect(() => {
    const sceneContext = sceneRef.current
    if (!sceneContext) {
      return
    }
    syncAssets(sceneContext, assets)
  }, [assets])

  useEffect(() => {
    const sceneContext = sceneRef.current
    if (!sceneContext) {
      return
    }
    applyActiveTourStop(sceneContext, activeTourStop)
  }, [activeTourStop])

  return <canvas ref={canvasRef} className="preview-canvas" />
}
