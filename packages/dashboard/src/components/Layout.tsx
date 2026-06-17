import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomTabBar } from './BottomTabBar';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        {/* pb-[76px] op mobiel = ruimte voor de bottom tab bar (incl. safe-area) */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-6 pb-[calc(76px+env(safe-area-inset-bottom))] lg:pb-6 safe-x">
          <Outlet />
        </main>
      </div>

      {/* iOS-stijl onderbalk — alleen mobiel */}
      <BottomTabBar onMore={() => setSidebarOpen(true)} />
    </div>
  );
}
