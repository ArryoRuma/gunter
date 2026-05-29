import { useRef } from 'react';

/**
 * PreviewTab — Phase 3 placeholder
 *
 * In Phase 3 this canvas will be handed to Babylon.js via the ref.
 * The scene will reflect the placed assets stored in Zustand / Dexie.
 */
export default function PreviewTab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">3D Preview</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Phase 3 — Babylon.js scene coming soon
        </p>
      </div>

      <canvas
        ref={canvasRef}
        className="flex-1 w-full rounded-lg border border-dashed border-gray-700 bg-gray-900"
        aria-label="Babylon.js 3D canvas"
      />
    </div>
  );
}
