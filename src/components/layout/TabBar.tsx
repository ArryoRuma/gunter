import type { TabId } from '@/lib/store';

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'plan', label: 'Plan' },
  { id: 'preview', label: '3D Preview' },
  { id: 'tour', label: 'Tour' },
  { id: 'share', label: 'Share' },
];

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="flex border-b border-gray-200 bg-white shadow-sm">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={[
            'px-6 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
            activeTab === tab.id
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
          ].join(' ')}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
