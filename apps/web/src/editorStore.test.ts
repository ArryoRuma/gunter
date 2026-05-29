import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from './editorStore'
import type { PlanSnapshot, Point } from './types'

const squareParcel: Point[] = [
  { x: 0, y: 0 },
  { x: 200, y: 0 },
  { x: 200, y: 200 },
  { x: 0, y: 200 },
]

describe('editorStore history commands', () => {
  beforeEach(() => {
    useEditorStore.getState().initializeFromProject(null)
  })

  it('tracks undo and redo for plan transitions', () => {
    const previous: PlanSnapshot = {
      parcelPoints: squareParcel,
      assets: [],
      calibration: null,
    }
    const next: PlanSnapshot = {
      parcelPoints: squareParcel,
      assets: [
        {
          id: 'asset-1',
          typeId: 'concessions',
          x: 80,
          y: 90,
          width: 56,
          height: 40,
          rotationDeg: 0,
        },
      ],
      calibration: null,
    }

    const store = useEditorStore.getState()
    store.commitPlanTransition('Place asset', previous, next, 'Asset placed.')

    expect(useEditorStore.getState().assets).toHaveLength(1)
    expect(useEditorStore.getState().undoStack).toHaveLength(1)
    expect(useEditorStore.getState().redoStack).toHaveLength(0)

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().assets).toHaveLength(0)
    expect(useEditorStore.getState().undoStack).toHaveLength(0)
    expect(useEditorStore.getState().redoStack).toHaveLength(1)

    useEditorStore.getState().redo()
    expect(useEditorStore.getState().assets).toHaveLength(1)
    expect(useEditorStore.getState().undoStack).toHaveLength(1)
    expect(useEditorStore.getState().redoStack).toHaveLength(0)
  })
})
