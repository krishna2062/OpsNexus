import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, Calendar, Terminal } from 'lucide-react';
import { api } from '../services/api';
import { AuditLog } from '../types';
import { EmptyState } from '../components/common/EmptyState';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity_type = entityFilter;

      const res = await api.getAuditLogs(params);
      if (res.success) setLogs(res.data || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, actionFilter, entityFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Security &amp; Audit Logs</h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
          Immutable event telemetry, administrative actions, credential changes, and system activities.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, user email, entity..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
          />
        </div>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
        >
          <option value="">All Entity Types</option>
          <option value="USER">User / Account</option>
          <option value="PROJECT">Project</option>
          <option value="TASK">Task</option>
          <option value="ATTENDANCE">Attendance</option>
          <option value="LEAVE">Leave</option>
          <option value="PAYROLL">Payroll</option>
          <option value="FILE">File</option>
          <option value="SYSTEM">System</option>
        </select>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500">Querying security audit logs from database...</p>
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No audit events found"
          description="There are currently no audit log records matching the specified criteria in the database."
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold font-sans">
                <tr>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Action Event</th>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Entity</th>
                  <th className="px-6 py-3.5">IP Address</th>
                  <th className="px-6 py-3.5">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap text-[11px]">
                      {new Date(log.created_at).toLocaleString([], {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-sans">
                      <div className="font-semibold text-gray-900">{log.user_email || 'System'}</div>
                      <div className="text-[10px] text-gray-400">{log.user_role}</div>
                    </td>
                    <td className="px-6 py-3 text-gray-700">
                      <span className="font-bold">{log.entity_type}</span>
                      {log.entity_id && (
                        <span className="text-[10px] text-gray-400 block truncate max-w-[120px]">
                          {log.entity_id}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-600 text-[11px]">{log.ip_address || '127.0.0.1'}</td>
                    <td className="px-6 py-3 text-gray-500 max-w-xs truncate text-[11px]">
                      {log.metadata ? JSON.stringify(log.metadata) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
