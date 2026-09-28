import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  MessageSquare,
  CalendarCheck,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MobileNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenDrawer: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentTab, onSelectTab, onOpenDrawer }) => {
  const { isAdmin } = useAuth();

  const primaryItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: isAdmin ? 'tasks' : 'workspace', label: isAdmin ? 'Tasks' : 'My Tasks', icon: CheckSquare },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-2 py-1 flex items-center justify-around shadow-lg safe-area-bottom">
      {primaryItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition cursor-pointer ${
              isActive ? 'text-blue-600 font-semibold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
            <span>{item.label}</span>
          </button>
        );
      })}

      <button
        onClick={onOpenDrawer}
        className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium text-gray-500 hover:text-gray-900 transition cursor-pointer"
      >
        <Menu className="w-5 h-5 mb-0.5 text-gray-400" />
        <span>Menu</span>
      </button>
    </nav>
  );
};
