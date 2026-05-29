/**
 * ShareTab — Phase 5 placeholder
 *
 * In Phase 5 the Export button will serialise the active project to a
 * ProjectDocument JSON and offer it as a file download.
 * The Import button will parse a dropped / selected JSON file and hydrate
 * the Dexie database + Zustand store.
 */
export default function ShareTab() {
  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Share</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Phase 5 — export/import coming soon
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          disabled
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium opacity-40 cursor-not-allowed"
          title="Export not yet implemented"
        >
          Export JSON
        </button>

        <button
          type="button"
          disabled
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium opacity-40 cursor-not-allowed"
          title="Import not yet implemented"
        >
          Import JSON
        </button>
      </div>
    </div>
  );
}
