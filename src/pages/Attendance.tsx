import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Clock,
  Download,
  Filter,
  CheckCircle,
  AlertCircle,
  Edit2,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Attendance, Department, User } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';

export const AttendancePage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [todayRecord, setTodayRecord] = useState<Attendance | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Check In/Out processing
  const [checkInNotes, setCheckInNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Correction Modal
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctingRecord, setCorrectingRecord] = useState<Attendance | null>(null);
  const [correctStatus, setCorrectStatus] = useState<string>('Present');
  const [correctHours, setCorrectHours] = useState<string>('8');
  const [correctReason, setCorrectReason] = useState<string>('');
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (selectedDept) params.department_id = selectedDept;
      if (selectedUser) params.user_id = selectedUser;
      if (selectedStatus) params.status = selectedStatus;

      const [listRes, todayRes, deptRes, empRes] = await Promise.all([
        api.getAttendanceList(params),
        api.getTodayAttendance(),
        api.getDepartments(),
        isAdmin ? api.getEmployees() : Promise.resolve({ success: true, data: [] }),
      ]);

      if (listRes.success) setAttendanceList(listRes.data || []);
      if (todayRes.success) setTodayRecord(todayRes.data);
      if (deptRes.success) setDepartments(deptRes.data || []);
      if (empRes.success) setEmployees(empRes.data || []);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [startDate, endDate, selectedDept, selectedUser, selectedStatus]);

  const handleCheckIn = async () => {
    setIsProcessing(true);
    try {
      const res = await api.checkIn(checkInNotes);
      if (res.success) {
        setTodayRecord(res.data);
        setCheckInNotes('');
        fetchAttendanceData();
      }
    } catch (err: any) {
      alert(err.message || 'Check-in failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckOut = async () => {
    setIsProcessing(true);
    try {
      const res = await api.checkOut(checkInNotes);
      if (res.success) {
        setTodayRecord(res.data);
        setCheckInNotes('');
        fetchAttendanceData();
      }
    } catch (err: any) {
      alert(err.message || 'Check-out failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCsv = () => {
    window.open('/api/attendance/export', '_blank');
  };

  const openCorrection = (record: Attendance) => {
    setCorrectingRecord(record);
    setCorrectStatus(record.status);
    setCorrectHours(String(record.total_working_hours || 8));
    setCorrectReason('');
    setCorrectionError(null);
    setIsCorrectionModalOpen(true);
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingRecord) return;
    if (!correctReason.trim()) {
      setCorrectionError('A justification reason is required for administrative audit tracking.');
      return;
    }

    try {
      const res = await api.correctAttendance(correctingRecord.id, {
        status: correctStatus,
        total_working_hours: Number(correctHours),
        correction_reason: correctReason.trim(),
      });
      if (res.success) {
        setIsCorrectionModalOpen(false);
        fetchAttendanceData();
      } else {
        setCorrectionError(res.message);
      }
    } catch (err: any) {
      setCorrectionError(err.message || 'Correction failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Attendance Log</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Track daily work check-ins, total hours, shift records, and presence status.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-gray-500" />
            Export CSV Log
          </button>
        )}
      </div>

      {/* Today's Punch Clock Card (For all staff & admins) */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                Today&apos;s Work Session ({new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })})
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {!todayRecord || !todayRecord.check_in_time
                  ? 'You have not checked in for duty yet.'
                  : !todayRecord.check_out_time
                  ? `Checked in at ${new Date(todayRecord.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • In Progress`
                  : `Shift completed. Checked out at ${new Date(todayRecord.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${todayRecord.total_working_hours} hours total).`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!todayRecord || !todayRecord.check_in_time ? (
              <button
                onClick={handleCheckIn}
                disabled={isProcessing}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Recording...' : 'Punch In Now'}
              </button>
            ) : !todayRecord.check_out_time ? (
              <button
                onClick={handleCheckOut}
                disabled={isProcessing}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Recording...' : 'Punch Out & Conclude'}
              </button>
            ) : (
              <div className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Shift Recorded
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>Dates:</span>
        </div>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
          placeholder="Start Date"
        />

        <span className="text-gray-400 text-xs">to</span>

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
          placeholder="End Date"
        />

        {isAdmin && (
          <>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.profile?.full_name || emp.username}
                </option>
              ))}
            </select>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </>
        )}

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
        >
          <option value="">All Statuses</option>
          <option value="Present">Present</option>
          <option value="Late">Late</option>
          <option value="Half Day">Half Day</option>
          <option value="Leave">Leave</option>
          <option value="Absent">Absent</option>
        </select>
      </div>

      {/* Attendance Records Table */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500">Retrieving attendance logs...</p>
        </div>
      ) : attendanceList.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No attendance records found"
          description="There are currently no attendance entries recorded in the database for the selected criteria."
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Check In</th>
                  <th className="px-6 py-3.5">Check Out</th>
                  <th className="px-6 py-3.5">Working Hours</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Notes</th>
                  {isAdmin && <th className="px-6 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendanceList.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 font-semibold text-gray-900">{rec.date}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{rec.employee_name}</div>
                      <div className="text-[11px] text-gray-500">{rec.department_name || 'No Dept'}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {rec.check_in_time ? (
                        new Date(rec.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {rec.check_out_time ? (
                        new Date(rec.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {rec.total_working_hours ? `${rec.total_working_hours} hrs` : '0 hrs'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={rec.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                      {rec.correction_reason ? (
                        <span className="text-amber-700 font-medium" title={rec.correction_reason}>
                          [Corrected: {rec.correction_reason}]
                        </span>
                      ) : (
                        rec.notes || '—'
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openCorrection(rec)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition cursor-pointer"
                          title="Admin Correction"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CORRECTION MODAL */}
      <Modal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        title="Administrative Attendance Correction"
        subtitle={`Adjust logged entry for ${correctingRecord?.employee_name} on ${correctingRecord?.date}`}
        maxWidth="md"
      >
        {correctionError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{correctionError}</span>
          </div>
        )}

        <form onSubmit={handleSaveCorrection} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Status</label>
            <select
              value={correctStatus}
              onChange={(e) => setCorrectStatus(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
            >
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Half Day">Half Day</option>
              <option value="Leave">Leave</option>
              <option value="Absent">Absent</option>
              <option value="Holiday">Holiday</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Total Working Hours</label>
            <input
              type="number"
              step="0.1"
              value={correctHours}
              onChange={(e) => setCorrectHours(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Correction Reason *</label>
            <textarea
              rows={3}
              required
              value={correctReason}
              onChange={(e) => setCorrectReason(e.target.value)}
              placeholder="Provide reason for manual correction (e.g. badge error, client off-site meeting)..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCorrectionModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              Save Correction
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
