import { useEffect, useRef } from 'react'
import type { PlacedAsset, Point, TourStop } from './types'

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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    let cancelled = false
    let cleanup = () => {}

    void (async () => {
      const babylon = await import('@babylonjs/core')
      if (cancelled) {
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
      light.intensity = environment === 'day' ? 0.95 : 0.5
      scene.clearColor =
        environment === 'day'
          ? new babylon.Color4(0.73, 0.84, 0.95, 1)
          : new babylon.Color4(0.08, 0.1, 0.2, 1)

      const ground = babylon.MeshBuilder.CreateGround(
        'ground',
        {
          width: 2400,
          height: 1800,
        },
        scene,
      )
      const groundMaterial = new babylon.StandardMaterial('ground-material', scene)
      groundMaterial.diffuseColor =
        environment === 'day'
          ? new babylon.Color3(0.17, 0.56, 0.24)
          : new babylon.Color3(0.1, 0.25, 0.14)
      ground.material = groundMaterial

      if (parcelPoints.length >= 3) {
        const parcelLinePoints = [...parcelPoints, parcelPoints[0]].map(
          (point) => new babylon.Vector3(point.x, 2, point.y),
        )
        const parcelOutline = babylon.MeshBuilder.CreateLines(
          'parcel-outline',
          { points: parcelLinePoints },
          scene,
        )
        parcelOutline.color = babylon.Color3.White()
      }

      assets.forEach((asset) => {
        const mesh = babylon.MeshBuilder.CreateBox(
          `asset-${asset.id}`,
          { width: asset.width, depth: asset.height, height: 18 },
          scene,
        )
        mesh.position = new babylon.Vector3(asset.x, 9, asset.y)
        mesh.rotation.y = (asset.rotationDeg * Math.PI) / 180
        const material = new babylon.StandardMaterial(`asset-material-${asset.id}`, scene)
        material.diffuseColor = new babylon.Color3(0.2, 0.5, 0.8)
        mesh.material = material
      })

      if (activeTourStop) {
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

      engine.runRenderLoop(() => scene.render())
      const onResize = () => engine.resize()
      window.addEventListener('resize', onResize)

      cleanup = () => {
        window.removeEventListener('resize', onResize)
        scene.dispose()
        engine.dispose()
      }
    })()

    return () => {
      cancelled = true
      cleanup()
    }
  }, [activeTourStop, assets, environment, parcelPoints])

  return <canvas ref={canvasRef} className="preview-canvas" />
}
