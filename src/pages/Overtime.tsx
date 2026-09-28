import React, { useState, useEffect } from 'react';
import { Clock, Plus, CheckCircle, XCircle, AlertCircle, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { OvertimeRecord } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';

export const OvertimePage: React.FC = () => {
  const { user, isAdmin, isProjectManager, isTeamLead } = useAuth();
  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Submit modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('21:00');
  const [totalHours, setTotalHours] = useState('3.0');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOvertime = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.getOvertimeList(params);
      if (res.success) setRecords(res.data || []);
    } catch (err) {
      console.error('Failed to load overtime:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOvertime();
  }, [statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.submitOvertime({
        date,
        start_time: startTime,
        end_time: endTime,
        total_hours: Number(totalHours),
        reason,
      });
      if (res.success) {
        setIsSubmitModalOpen(false);
        setReason('');
        fetchOvertime();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      const res = await api.reviewOvertime(id, status);
      if (res.success) {
        fetchOvertime();
      }
    } catch (err: any) {
      alert(err.message || 'Review failed');
    }
  };

  const canReview = isAdmin || isProjectManager || isTeamLead;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Overtime Management</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Log extended working shifts, compute compensation amounts, and process management approvals.
          </p>
        </div>

        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Claim Overtime
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        {['', 'Pending', 'Approved', 'Rejected'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`pb-3 text-xs sm:text-sm font-medium border-b-2 transition cursor-pointer ${
              statusFilter === st
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {st || 'All Claims'}
          </button>
        ))}
      </div>

      {/* Records Table */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500">Querying overtime records from database...</p>
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No overtime claims found"
          description="There are currently no overtime claims recorded in the database for this view."
          actionText="Submit Overtime Claim"
          onAction={() => setIsSubmitModalOpen(true)}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Shift Window</th>
                  <th className="px-6 py-3.5">Hours</th>
                  <th className="px-6 py-3.5">Claim Amount</th>
                  <th className="px-6 py-3.5">Reason</th>
                  <th className="px-6 py-3.5">Status</th>
                  {canReview && <th className="px-6 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 font-semibold text-gray-900">{r.employee_name}</td>
                    <td className="px-6 py-4 font-medium text-gray-700">{r.date}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {r.start_time} - {r.end_time}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">{r.total_hours} hrs</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">
                      ${r.total_amount?.toLocaleString()} (${r.hourly_rate}/hr)
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{r.reason || '—'}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                    {canReview && (
                      <td className="px-6 py-4 text-right">
                        {r.status === 'Pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleReview(r.id, 'Approved')}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview(r.id, 'Rejected')}
                              className="px-2.5 py-1 bg-rose-600 text-white rounded text-xs font-semibold hover:bg-rose-700 cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400">Decision logged</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBMIT OVERTIME MODAL */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit Overtime Claim"
        subtitle="Log approved additional working hours for compensation."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Date *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Start Time *</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">End Time *</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Total Overtime Hours *</label>
            <input
              type="number"
              step="0.5"
              required
              value={totalHours}
              onChange={(e) => setTotalHours(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Operational Justification</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Production release deployment / Urgent client critical defect resolution..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
