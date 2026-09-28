import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  FolderKanban,
  BadgeDollarSign,
  Download,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Department } from '../types';

export const Reports: React.FC = () => {
  const { isAdmin } = useAuth();
  const [activeReport, setActiveReport] = useState<'attendance' | 'overview'>('overview');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [attReport, setAttReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [dashRes, attRes, deptRes] = await Promise.all([
        api.getDashboardStats(),
        api.getAttendanceReport({ start_date: startDate, end_date: endDate }),
        api.getDepartments(),
      ]);

      if (dashRes.success) setStats(dashRes.data);
      if (attRes.success) setAttReport(attRes.data);
      if (deptRes.success) setDepartments(deptRes.data || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  const handleExportAttendance = () => {
    window.open('/api/attendance/export', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Executive Reporting &amp; Audits</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Cross-organizational business intelligence calculated from the live database.
          </p>
        </div>

        <button
          onClick={handleExportAttendance}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Export Complete Attendance Log (CSV)
        </button>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3 text-xs">
        <span className="font-semibold text-gray-700">Reporting Window:</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
        />
        <span className="text-gray-400">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
        />
        {(startDate || endDate) && (
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer ml-2"
          >
            Reset
          </button>
        )}
      </div>

      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Attendance Logged</span>
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{attReport?.totalRecords || 0} days</div>
          <p className="text-[11px] text-gray-500 mt-1">
            {attReport?.presentCount || 0} shifts present • {attReport?.lateCount || 0} late check-ins
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Hours Productive</span>
            <CalendarDays className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{attReport?.totalWorkingHours || 0} hrs</div>
          <p className="text-[11px] text-gray-500 mt-1">
            Avg {attReport?.averageHoursPerDay || 0} hrs / active shift
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Task Completion</span>
            <FolderKanban className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats?.summary?.completedTasks || 0} tasks</div>
          <p className="text-[11px] text-gray-500 mt-1">
            Out of {stats?.summary?.totalTasks || 0} total assigned
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Monthly Compensation</span>
            <BadgeDollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            ${stats?.summary?.monthlyPayroll?.toLocaleString() || 0}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            + ${stats?.summary?.monthlyOvertimeCost?.toLocaleString() || 0} overtime
          </p>
        </div>
      </div>

      {/* Deep-Dive Analytical Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Health Analysis */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Project Delivery &amp; Distribution</h3>
          <p className="text-xs text-gray-500">
            Status distribution of company projects tracked directly in PostgreSQL.
          </p>

          <div className="space-y-3 pt-2">
            {stats?.charts?.projectStatusDistribution?.map((p: any) => (
              <div key={p.name} className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-gray-50">
                <span className="font-semibold text-gray-800">{p.name}</span>
                <span className="font-bold text-gray-900">{p.count} project(s)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Task Velocity Analysis */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Task Execution Velocity</h3>
          <p className="text-xs text-gray-500">
            Fulfillment breakdown of operational deliverables.
          </p>

          <div className="space-y-3 pt-2">
            {stats?.charts?.taskStatusDistribution?.map((t: any) => (
              <div key={t.name} className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-gray-50">
                <span className="font-semibold text-gray-800">{t.name}</span>
                <span className="font-bold text-gray-900">{t.count} task(s)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
