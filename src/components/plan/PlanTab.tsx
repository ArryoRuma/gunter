/**
 * PlanTab — Phase 1 placeholder
 *
 * In Phase 1 this canvas will host the 2D plan editor:
 * parcel polygon drawing, scale calibration, asset placement, and drag-to-move.
 */
export default function PlanTab() {
  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">2D Plan Editor</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Phase 1 — 2D editor coming soon
        </p>
      </div>

      <canvas
        className="flex-1 w-full rounded-lg border border-dashed border-gray-300 bg-white"
        aria-label="2D plan canvas"
      />
    </div>
  );
}
