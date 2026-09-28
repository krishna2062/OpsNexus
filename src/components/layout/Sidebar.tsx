import React from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarCheck,
  CalendarDays,
  FolderKanban,
  CheckSquare,
  BadgeDollarSign,
  Clock,
  Mail,
  MessageSquare,
  FileText,
  Megaphone,
  BarChart3,
  ShieldCheck,
  Settings,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, isOpen, onClose }) => {
  const { user, isAdmin, isProjectManager } = useAuth();

  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
    if (onClose) onClose();
  };

  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'leaves', label: 'Leave Requests', icon: CalendarDays },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'payroll', label: 'Payroll', icon: BadgeDollarSign },
    { id: 'overtime', label: 'Overtime', icon: Clock },
    { id: 'mail', label: 'Internal Mail', icon: Mail },
    { id: 'chat', label: 'Team Chat', icon: MessageSquare },
    { id: 'files', label: 'File Vault', icon: FileText },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'audit-logs', label: 'Audit Logs', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const staffNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'workspace', label: 'Staff Workspace', icon: Briefcase },
    { id: 'projects', label: 'My Projects', icon: FolderKanban },
    { id: 'tasks', label: 'My Tasks', icon: CheckSquare },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'leaves', label: 'Leave Requests', icon: CalendarDays },
    { id: 'payroll', label: 'My Payslips', icon: BadgeDollarSign },
    { id: 'overtime', label: 'My Overtime', icon: Clock },
    { id: 'mail', label: 'Internal Mail', icon: Mail },
    { id: 'chat', label: 'Team Chat', icon: MessageSquare },
    { id: 'files', label: 'Company Files', icon: FileText },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'profile', label: 'My Profile', icon: UserCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const navItems = isAdmin ? adminNavItems : staffNavItems;

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            O
          </div>
          <div>
            <h1 className="font-semibold text-white tracking-tight leading-none text-base">OpsNexus</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Enterprise Core</p>
          </div>
        </div>
      </div>

      {/* User Badge Bar */}
      <div className="px-4 py-3 mx-3 my-3 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center font-medium text-sm">
          {user?.profile?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-100 truncate">{user?.profile?.full_name || user?.username}</p>
          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 font-medium border border-blue-700/40">
            {user?.role_name}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
        <div className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider px-3 mb-2">
          {isAdmin ? 'Administration' : 'Workplace'}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer text-left ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
        <span>Supabase Core</span>
        <span className="inline-flex items-center gap-1.5 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Active
        </span>
      </div>
    </aside>
  );
};
