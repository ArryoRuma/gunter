/**
 * TourTab — Phase 4 placeholder
 *
 * In Phase 4 this panel will let creators add, reorder, and preview
 * guided tour stops that drive a Babylon.js camera fly-through.
 */
export default function TourTab() {
  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Tour</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Phase 4 — tour authoring coming soon
        </p>
      </div>

      <div className="flex-1 rounded-lg border border-dashed border-gray-300 bg-white p-4">
        <ul>
          <li className="text-sm text-gray-400 italic">No tour stops yet.</li>
        </ul>
      </div>
    </div>
  );
}
