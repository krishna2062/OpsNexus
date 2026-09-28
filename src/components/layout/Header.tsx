import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  CheckCircle2,
  Clock,
  LogOut,
  Menu,
  ChevronDown,
  User as UserIcon,
  Check,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { NotificationItem, Attendance } from '../../types';

interface HeaderProps {
  onToggleMobileNav: () => void;
  onSelectTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileNav, onSelectTab }) => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Load today's attendance and notifications
  const loadHeaderData = async () => {
    try {
      const [attRes, notifRes] = await Promise.all([
        api.getTodayAttendance(),
        api.getNotifications(),
      ]);
      if (attRes.success) setTodayAttendance(attRes.data);
      if (notifRes.success) setNotifications(notifRes.data || []);
    } catch (err) {
      // quiet fail
    }
  };

  useEffect(() => {
    loadHeaderData();
    const interval = setInterval(loadHeaderData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Search debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.search(searchQuery);
        if (res.success) {
          setSearchResults(res.data);
          setShowSearchDropdown(true);
        }
      } catch (err) {
        // quiet fail
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCheckIn = async () => {
    setIsAttendanceLoading(true);
    try {
      const res = await api.checkIn();
      if (res.success) {
        setTodayAttendance(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Check-in failed');
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setIsAttendanceLoading(true);
    try {
      const res = await api.checkOut();
      if (res.success) {
        setTodayAttendance(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Check-out failed');
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      // ignore
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile Toggle & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={onToggleMobileNav}
          className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Box */}
        <div ref={searchRef} className="relative w-full">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employees, tasks, projects, files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults) setShowSearchDropdown(true);
              }}
              className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Search Dropdown */}
          {showSearchDropdown && searchResults && (
            <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 p-2 max-h-96 overflow-y-auto">
              {searchResults.employees?.length === 0 &&
              searchResults.projects?.length === 0 &&
              searchResults.tasks?.length === 0 &&
              searchResults.files?.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500">No matching records found.</div>
              ) : (
                <div className="space-y-3">
                  {searchResults.employees?.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
                        Employees
                      </div>
                      {searchResults.employees.map((item: any) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            onSelectTab('employees');
                            setShowSearchDropdown(false);
                          }}
                          className="px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                        >
                          <span className="text-xs font-medium text-gray-900">{item.title}</span>
                          <span className="text-[11px] text-gray-500">{item.subtitle}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.projects?.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
                        Projects
                      </div>
                      {searchResults.projects.map((item: any) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            onSelectTab('projects');
                            setShowSearchDropdown(false);
                          }}
                          className="px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                        >
                          <span className="text-xs font-medium text-gray-900">{item.title}</span>
                          <span className="text-[11px] text-gray-500">{item.subtitle}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.tasks?.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
                        Tasks
                      </div>
                      {searchResults.tasks.map((item: any) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            onSelectTab('tasks');
                            setShowSearchDropdown(false);
                          }}
                          className="px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                        >
                          <span className="text-xs font-medium text-gray-900">{item.title}</span>
                          <span className="text-[11px] text-gray-500">{item.subtitle}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Attendance Widget */}
        <div className="hidden sm:flex items-center gap-2 pr-2 border-r border-gray-200">
          {!todayAttendance || !todayAttendance.check_in_time ? (
            <button
              onClick={handleCheckIn}
              disabled={isAttendanceLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Clock className="w-3.5 h-3.5" />
              Check In
            </button>
          ) : !todayAttendance.check_out_time ? (
            <button
              onClick={handleCheckOut}
              disabled={isAttendanceLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Check Out
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-medium">
              <Check className="w-3.5 h-3.5" />
              <span>Checked Out ({todayAttendance.total_working_hours}h)</span>
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 animate-in fade-in">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-gray-900">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400">No notifications at this time.</div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      className={`p-3.5 hover:bg-gray-50 transition ${!n.is_read ? 'bg-blue-50/40' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-900 leading-snug">{n.title}</p>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {n.description && <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">{n.description}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div ref={userDropdownRef} className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-lg transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-xs shadow-xs">
              {user?.profile?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-gray-800 leading-tight">
                {user?.profile?.full_name || user?.username}
              </p>
              <p className="text-[10px] text-gray-500 leading-tight">{user?.role_name}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 p-1 animate-in fade-in">
              <div className="px-3 py-2 border-b border-gray-100 mb-1">
                <p className="text-xs font-semibold text-gray-900">{user?.profile?.full_name || user?.username}</p>
                <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  onSelectTab('profile');
                  setShowUserDropdown(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition text-left cursor-pointer"
              >
                <UserIcon className="w-4 h-4 text-gray-400" />
                My Profile
              </button>
              <button
                onClick={() => {
                  onSelectTab('settings');
                  setShowUserDropdown(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition text-left cursor-pointer"
              >
                <Shield className="w-4 h-4 text-gray-400" />
                Security &amp; Settings
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition text-left cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
