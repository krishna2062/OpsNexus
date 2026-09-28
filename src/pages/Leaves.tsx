import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { LeaveRequest, LeaveType } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';

export const Leaves: React.FC = () => {
  const { user, isAdmin, isTeamLead } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Submit Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review Modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  const fetchLeavesData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;

      const [leavesRes, typesRes] = await Promise.all([
        api.getLeaves(params),
        api.getLeaveTypes(),
      ]);

      if (leavesRes.success) setLeaves(leavesRes.data || []);
      if (typesRes.success) {
        setLeaveTypes(typesRes.data || []);
        if (typesRes.data?.length > 0 && !leaveTypeId) {
          setLeaveTypeId(typesRes.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeavesData();
  }, [statusFilter]);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveTypeId || !startDate || !endDate || !reason.trim()) {
      setSubmitError('Please complete all required fields.');
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const res = await api.submitLeave({
        leave_type_id: leaveTypeId,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
      });

      if (res.success) {
        setIsSubmitModalOpen(false);
        setReason('');
        setStartDate('');
        setEndDate('');
        fetchLeavesData();
      } else {
        setSubmitError(res.message);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit leave request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async (status: 'Approved' | 'Rejected') => {
    if (!selectedLeave) return;
    setIsReviewing(true);

    try {
      const res = await api.reviewLeave(selectedLeave.id, status, reviewRemarks);
      if (res.success) {
        setIsReviewModalOpen(false);
        setSelectedLeave(null);
        setReviewRemarks('');
        fetchLeavesData();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message || 'Review action failed');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;
    try {
      const res = await api.cancelLeave(id);
      if (res.success) {
        fetchLeavesData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to cancel leave request');
    }
  };

  // Calculate day count preview
  let calculatedDays = 0;
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (e >= s) {
      calculatedDays = Math.round((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1;
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Leave Management</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Submit time-off requests, review applications, and track leave balances.
          </p>
        </div>

        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Request Leave
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex gap-2 sm:gap-4 overflow-x-auto">
          {['', 'Pending', 'Approved', 'Rejected', 'Cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`pb-3 text-xs sm:text-sm font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {st || 'All Requests'}
            </button>
          ))}
        </div>
      </div>

      {/* Leave Requests Table */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500">Querying leave records from database...</p>
        </div>
      ) : leaves.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No leave requests found"
          description="There are currently no leave requests recorded for this view in the database."
          actionText="Submit Time-Off Request"
          onAction={() => setIsSubmitModalOpen(true)}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Leave Type</th>
                  <th className="px-6 py-3.5">Duration</th>
                  <th className="px-6 py-3.5">Days</th>
                  <th className="px-6 py-3.5">Reason</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{leave.employee_name}</div>
                      <div className="text-[11px] text-gray-500">{leave.department_name || 'No Dept'}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-800">{leave.leave_type_name}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {leave.start_date} <span className="text-gray-400">to</span> {leave.end_date}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">{leave.number_of_days} days</td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={leave.reason}>
                      {leave.reason}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={leave.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isAdmin || isTeamLead ? (
                        leave.status === 'Pending' ? (
                          <button
                            onClick={() => {
                              setSelectedLeave(leave);
                              setReviewRemarks('');
                              setIsReviewModalOpen(true);
                            }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-xs cursor-pointer"
                          >
                            Review
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-400">
                            {leave.reviewed_by_name ? `Reviewed by ${leave.reviewed_by_name}` : 'Completed'}
                          </span>
                        )
                      ) : leave.status === 'Pending' && leave.user_id === user?.id ? (
                        <button
                          onClick={() => handleCancel(leave.id)}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBMIT LEAVE MODAL */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit Leave Request"
        subtitle="Request planned or medical absence from duty."
        maxWidth="md"
      >
        {submitError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmitLeave} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Leave Category *</label>
            <select
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
            >
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name} ({lt.days_allowed} days allowed • {lt.is_paid ? 'Paid' : 'Unpaid'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">End Date *</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>
          </div>

          {calculatedDays > 0 && (
            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-blue-900 font-semibold text-center">
              Total requested: {calculatedDays} day(s)
            </div>
          )}

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Reason for Absence *</label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State clear operational reason for your leave request..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* REVIEW LEAVE MODAL (Admin & PM) */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="Review Leave Application"
        subtitle={`Application from ${selectedLeave?.employee_name}`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-gray-50 rounded-lg space-y-1.5">
            <div>
              <span className="text-gray-500">Leave Type:</span>{' '}
              <span className="font-semibold text-gray-900">{selectedLeave?.leave_type_name}</span>
            </div>
            <div>
              <span className="text-gray-500">Dates:</span>{' '}
              <span className="font-semibold text-gray-900">
                {selectedLeave?.start_date} to {selectedLeave?.end_date} ({selectedLeave?.number_of_days} days)
              </span>
            </div>
            <div>
              <span className="text-gray-500">Reason:</span>{' '}
              <p className="text-gray-800 mt-0.5">{selectedLeave?.reason}</p>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Administrative Remarks / Feedback</label>
            <textarea
              rows={2}
              value={reviewRemarks}
              onChange={(e) => setReviewRemarks(e.target.value)}
              placeholder="Optional remarks sent to employee upon decision..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              disabled={isReviewing}
              onClick={() => handleReview('Rejected')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg cursor-pointer disabled:opacity-50"
            >
              Reject Leave
            </button>
            <button
              type="button"
              disabled={isReviewing}
              onClick={() => handleReview('Approved')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg cursor-pointer disabled:opacity-50"
            >
              Approve Leave
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
