import type { ReactNode } from 'react';

interface AppShellProps {
  tabBar: ReactNode;
  children: ReactNode;
}

/**
 * Top-level layout wrapper.
 * Renders the tab bar at the top and the active tab panel below it,
 * stretching the content area to fill the remaining viewport height.
 */
export default function AppShell({ tabBar, children }: AppShellProps) {
  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Fixed navigation strip */}
      <header className="shrink-0">{tabBar}</header>

      {/* Scrollable content area */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
