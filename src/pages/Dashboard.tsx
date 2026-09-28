import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle,
  CalendarCheck,
  CalendarX,
  CalendarDays,
  FolderKanban,
  CheckSquare,
  BadgeDollarSign,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Briefcase,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DashboardStats } from '../types';

interface DashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateTab }) => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const res = await api.getDashboardStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500 font-medium">Querying database metrics...</p>
        </div>
      </div>
    );
  }

  const s = stats?.summary || {
    totalEmployees: 0,
    activeEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    onLeaveToday: 0,
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    pendingProjects: 0,
    overdueProjects: 0,
    totalTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    pendingLeaveRequests: 0,
    monthlyPayroll: 0,
    monthlyOvertimeHours: 0,
    monthlyOvertimeCost: 0,
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-400/20">
            <Sparkles className="w-3.5 h-3.5" /> Operations Intelligence
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Welcome, {user?.profile?.full_name || user?.username}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            Real-time organizational telemetry and workforce management loaded directly from the database.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-96 bg-radial from-blue-500/10 to-transparent pointer-events-none" />
      </div>

      {/* Top Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Employees */}
        <div
          onClick={() => onNavigateTab('employees')}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs hover:border-blue-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Employees</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{s.totalEmployees}</div>
          <p className="text-[11px] text-gray-500 mt-0.5">{s.activeEmployees} active accounts</p>
        </div>

        {/* Present Today */}
        <div
          onClick={() => onNavigateTab('attendance')}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs hover:border-emerald-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Present Today</span>
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600">{s.presentToday}</div>
          <p className="text-[11px] text-gray-500 mt-0.5">Checked in</p>
        </div>

        {/* Absent Today */}
        <div
          onClick={() => onNavigateTab('attendance')}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs hover:border-rose-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Absent Today</span>
            <CalendarX className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-600">{s.absentToday}</div>
          <p className="text-[11px] text-gray-500 mt-0.5">{s.onLeaveToday} on leave</p>
        </div>

        {/* Active Projects */}
        <div
          onClick={() => onNavigateTab('projects')}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs hover:border-indigo-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Active Projects</span>
            <FolderKanban className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{s.activeProjects}</div>
          <p className="text-[11px] text-gray-500 mt-0.5">{s.totalProjects} total projects</p>
        </div>

        {/* Tasks in Progress */}
        <div
          onClick={() => onNavigateTab('tasks')}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs hover:border-purple-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">In Progress Tasks</span>
            <CheckSquare className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{s.inProgressTasks}</div>
          <p className="text-[11px] text-gray-500 mt-0.5">{s.completedTasks} completed</p>
        </div>

        {/* Pending Leaves */}
        <div
          onClick={() => onNavigateTab('leaves')}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs hover:border-amber-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Pending Leaves</span>
            <CalendarDays className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-600">{s.pendingLeaveRequests}</div>
          <p className="text-[11px] text-gray-500 mt-0.5">Awaiting review</p>
        </div>
      </div>

      {/* Financials & Alerts Ribbon (Admin & PM) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Monthly Payroll Cost */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {isAdmin ? 'Monthly Payroll Cost' : 'Current Monthly Statement'}
            </span>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              ${s.monthlyPayroll.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Calculated from registered payrolls</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BadgeDollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Monthly Overtime */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Approved Overtime</span>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {s.monthlyOvertimeHours} <span className="text-sm font-normal text-gray-500">hours</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">${s.monthlyOvertimeCost.toLocaleString()} total expense</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Overdue Deadlines Warning */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Overdue Alerts</span>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              {s.overdueTasks + s.overdueProjects}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {s.overdueProjects} project(s), {s.overdueTasks} task(s) overdue
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Status Breakdown & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Pipeline Status */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Project Pipeline</h3>
              <p className="text-xs text-gray-500">Live breakdown of all projects by state</p>
            </div>
            <button
              onClick={() => onNavigateTab('projects')}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer inline-flex items-center gap-1"
            >
              View Projects <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {stats?.charts?.projectStatusDistribution?.map((item) => {
              const total = s.totalProjects || 1;
              const percent = Math.round((item.count / total) * 100);
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-gray-700">{item.name}</span>
                    <span className="text-gray-500">
                      {item.count} ({s.totalProjects > 0 ? percent : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${s.totalProjects > 0 ? percent : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task Completion Metrics */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Task Fulfillment</h3>
              <p className="text-xs text-gray-500">Current status of active organization tasks</p>
            </div>
            <button
              onClick={() => onNavigateTab('tasks')}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer inline-flex items-center gap-1"
            >
              View Tasks <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {stats?.charts?.taskStatusDistribution?.map((item) => {
              const total = s.totalTasks || 1;
              const percent = Math.round((item.count / total) * 100);
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-gray-700">{item.name}</span>
                    <span className="text-gray-500">
                      {item.count} ({s.totalTasks > 0 ? percent : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${s.totalTasks > 0 ? percent : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Audit Activities */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Recent System Activity</h3>
          </div>
          {isAdmin && (
            <button
              onClick={() => onNavigateTab('audit-logs')}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer inline-flex items-center gap-1"
            >
              Full Audit Trail <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {stats?.recentActivities && stats.recentActivities.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {stats.recentActivities.map((act) => (
              <div key={act.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <div>
                    <span className="font-semibold text-gray-900">{act.action}</span>
                    <span className="text-gray-500 ml-1">by {act.user_email}</span>
                  </div>
                </div>
                <span className="text-gray-400 text-[11px]">
                  {new Date(act.created_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-gray-400">No activity logged yet.</div>
        )}
      </div>
    </div>
  );
};
