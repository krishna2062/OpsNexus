import React, { useState, useEffect } from 'react';
import {
  BadgeDollarSign,
  Plus,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  Download,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Payroll, User } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';

export const PayrollPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [payrollList, setPayrollList] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modal
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [batchMonth, setBatchMonth] = useState(selectedMonth);
  const [isGenerating, setIsGenerating] = useState(false);

  // Single create form
  const [createForm, setCreateForm] = useState({
    user_id: '',
    month_year: selectedMonth,
    basic_salary: '5000',
    allowances: '500',
    bonus: '0',
    overtime_pay: '0',
    deductions: '100',
    tax: '400',
    notes: '',
  });

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      const [payRes, empRes, sumRes] = await Promise.all([
        api.getPayroll({ month_year: selectedMonth }),
        isAdmin ? api.getEmployees() : Promise.resolve({ success: true, data: [] }),
        isAdmin ? api.getPayrollSummary() : Promise.resolve({ success: true, data: null }),
      ]);

      if (payRes.success) setPayrollList(payRes.data || []);
      if (empRes.success) setEmployees(empRes.data || []);
      if (sumRes.success && sumRes.data) setSummary(sumRes.data);
    } catch (err) {
      console.error('Failed to load payroll:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, [selectedMonth]);

  const handleGenerateBatch = async () => {
    setIsGenerating(true);
    try {
      const res = await api.generateMonthlyPayroll(batchMonth);
      if (res.success) {
        setIsGenerateModalOpen(false);
        setSelectedMonth(batchMonth);
        fetchPayrollData();
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate payroll');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.user_id) {
      alert('Please select an employee.');
      return;
    }

    try {
      const res = await api.createPayrollRecord(createForm);
      if (res.success) {
        setIsCreateModalOpen(false);
        fetchPayrollData();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create payroll');
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await api.updatePayrollStatus(id, newStatus, new Date().toISOString().split('T')[0]);
      if (res.success) {
        fetchPayrollData();
      }
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            {isAdmin ? 'Corporate Payroll & Compensation' : 'My Salary & Payslips'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            {isAdmin
              ? 'Disbursements, compensation ledger, automatic tax/overtime deduction calculations.'
              : 'View permitted personal monthly payslips, taxes, deductions, and disbursement records.'}
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              Batch Monthly Payroll
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Manual Entry
            </button>
          </div>
        )}
      </div>

      {/* Admin Summary Financials */}
      {isAdmin && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Disbursed</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                ${summary.totalPayrollPaid.toLocaleString()}
              </div>
              <p className="text-[11px] text-gray-500">Completed payments</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Payroll</span>
              <div className="text-2xl font-bold text-amber-600 mt-1">
                ${summary.totalPendingPayroll.toLocaleString()}
              </div>
              <p className="text-[11px] text-gray-500">Unprocessed salaries</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Approved Overtime Cost</span>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                ${summary.totalOvertimeCost.toLocaleString()}
              </div>
              <p className="text-[11px] text-gray-500">Overtime expenditures</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Filter by Month */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-semibold text-gray-700">Billing Cycle (YYYY-MM):</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-semibold"
          />
        </div>
      </div>

      {/* Payroll Table */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500">Querying payroll records from database...</p>
        </div>
      ) : payrollList.length === 0 ? (
        <EmptyState
          icon={BadgeDollarSign}
          title="No payroll records found"
          description={`There are currently no payroll records recorded for ${selectedMonth} in the database.`}
          actionText={isAdmin ? 'Generate Monthly Payroll' : undefined}
          onAction={isAdmin ? () => setIsGenerateModalOpen(true) : undefined}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Basic Salary</th>
                  <th className="px-6 py-3.5">Allowances / Bonus</th>
                  <th className="px-6 py-3.5">Overtime Pay</th>
                  <th className="px-6 py-3.5">Tax &amp; Deductions</th>
                  <th className="px-6 py-3.5">Net Pay</th>
                  <th className="px-6 py-3.5">Status</th>
                  {isAdmin && <th className="px-6 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payrollList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{p.employee_name}</div>
                      <div className="text-[11px] text-gray-500">{p.employee_id_code || p.department_name}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-700">${p.basic_salary?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-600">
                      ${((p.allowances || 0) + (p.bonus || 0)).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-blue-600 font-medium">
                      ${p.overtime_pay?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 text-rose-600 font-medium">
                      -${((p.deductions || 0) + (p.tax || 0)).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 text-sm">
                      ${p.net_salary?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={p.payment_status} size="sm" />
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        {p.payment_status !== 'Paid' ? (
                          <button
                            onClick={() => handleStatusUpdate(p.id, 'Paid')}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-xs cursor-pointer"
                          >
                            Mark Paid
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-400">Disbursed</span>
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

      {/* BATCH GENERATE MODAL */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title="Batch Generate Monthly Payroll"
        subtitle="Automatically calculates salary, approved overtime, and estimated taxes for all active staff."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Target Billing Month</label>
            <input
              type="month"
              value={batchMonth}
              onChange={(e) => setBatchMonth(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-semibold"
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-900">
            <p className="font-semibold">Calculation Matrix:</p>
            <p className="mt-0.5 text-[11px]">
              • Basic salary from each employee profile
              <br />
              • Total sum of approved overtime hours logged for this month
              <br />
              • Standard 8% estimated withholding tax
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsGenerateModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateBatch}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg disabled:opacity-50"
            >
              {isGenerating ? 'Processing...' : 'Run Payroll Engine'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MANUAL ENTRY MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Single Payroll Record"
        subtitle="Manually enter an employee statement."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSingle} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Employee *</label>
              <select
                required
                value={createForm.user_id}
                onChange={(e) => setCreateForm({ ...createForm, user_id: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.profile?.full_name || emp.username}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Month Year (YYYY-MM)</label>
              <input
                type="month"
                required
                value={createForm.month_year}
                onChange={(e) => setCreateForm({ ...createForm, month_year: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Basic Salary ($)</label>
              <input
                type="number"
                value={createForm.basic_salary}
                onChange={(e) => setCreateForm({ ...createForm, basic_salary: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Allowances ($)</label>
              <input
                type="number"
                value={createForm.allowances}
                onChange={(e) => setCreateForm({ ...createForm, allowances: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Bonus ($)</label>
              <input
                type="number"
                value={createForm.bonus}
                onChange={(e) => setCreateForm({ ...createForm, bonus: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Overtime Pay ($)</label>
              <input
                type="number"
                value={createForm.overtime_pay}
                onChange={(e) => setCreateForm({ ...createForm, overtime_pay: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Deductions ($)</label>
              <input
                type="number"
                value={createForm.deductions}
                onChange={(e) => setCreateForm({ ...createForm, deductions: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Tax Withheld ($)</label>
              <input
                type="number"
                value={createForm.tax}
                onChange={(e) => setCreateForm({ ...createForm, tax: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              Save Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
