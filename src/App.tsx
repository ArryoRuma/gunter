import { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import TabBar from '@/components/layout/TabBar';
import PlanTab from '@/components/plan/PlanTab';
import PreviewTab from '@/components/preview/PreviewTab';
import TourTab from '@/components/tour/TourTab';
import ShareTab from '@/components/share/ShareTab';
import type { TabId } from '@/lib/store';

/**
 * App — root shell
 *
 * Owns the active tab state and delegates rendering to each tab panel.
 * As the project grows, active tab selection will move into the Zustand store
 * so that deep links and URL-based routing can drive the active view.
 */
function App() {
  const [activeTab, setActiveTab] = useState<TabId>('plan');

  return (
    <AppShell
      tabBar={<TabBar activeTab={activeTab} onTabChange={setActiveTab} />}
    >
      {activeTab === 'plan' && <PlanTab />}
      {activeTab === 'preview' && <PreviewTab />}
      {activeTab === 'tour' && <TourTab />}
      {activeTab === 'share' && <ShareTab />}
    </AppShell>
  );
}

export default App;
