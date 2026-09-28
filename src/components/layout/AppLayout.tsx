import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

interface AppLayoutProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ currentTab, onSelectTab, children }) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex text-gray-900 font-sans antialiased">
      {/* Desktop & Mobile Drawer Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* Main Container */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        <Header
          onToggleMobileNav={() => setMobileDrawerOpen(!mobileDrawerOpen)}
          onSelectTab={onSelectTab}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-20 md:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav
          currentTab={currentTab}
          onSelectTab={onSelectTab}
          onOpenDrawer={() => setMobileDrawerOpen(true)}
        />
      </div>
    </div>
  );
};
