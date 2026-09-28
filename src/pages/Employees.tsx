import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  Building2,
  Calendar,
  Shield,
  Key,
  Check,
  AlertCircle,
  X,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { User, Department, Role } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';

export const Employees: React.FC = () => {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [newTempPassword, setNewTempPassword] = useState('');

  // Add Employee Form State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    employee_id: '',
    department_id: '',
    role_id: '',
    position: 'Software Engineer',
    phone: '',
    address: '',
    date_of_birth: '',
    gender: 'Prefer not to say',
    employment_type: 'Full-Time',
    basic_salary: '5000',
    joining_date: new Date().toISOString().split('T')[0],
    bank_name: '',
    account_number: '',
    routing_number: '',
    account_holder: '',
    skills: 'TypeScript, React, Node.js',
    bio: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEmployeesData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (deptFilter) params.department_id = deptFilter;

      const [empRes, deptRes, setRes] = await Promise.all([
        api.getEmployees(params),
        api.getDepartments(),
        api.getSettings(),
      ]);

      if (empRes.success) setEmployees(empRes.data || []);
      if (deptRes.success) setDepartments(deptRes.data || []);
      if (setRes.success && setRes.data?.roles) setRoles(setRes.data.roles);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeesData();
  }, [search, statusFilter, deptFilter]);

  const handleOpenDetails = async (emp: User) => {
    try {
      const res = await api.getEmployeeById(emp.id);
      if (res.success) {
        setSelectedEmployee(res.data);
        setIsDetailsDrawerOpen(true);
      }
    } catch (err) {
      alert('Failed to load full employee profile');
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        employee_id: formData.employee_id,
        department_id: formData.department_id || null,
        role_id: formData.role_id || null,
        position: formData.position,
        phone: formData.phone,
        address: formData.address,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        employment_type: formData.employment_type,
        basic_salary: Number(formData.basic_salary) || 0,
        joining_date: formData.joining_date,
        bank_information: {
          bank_name: formData.bank_name,
          account_number: formData.account_number,
          routing_number: formData.routing_number,
          account_holder: formData.account_holder,
        },
        skills: formData.skills,
        bio: formData.bio,
      };

      const res = await api.createEmployee(payload);
      if (res.success) {
        setIsAddModalOpen(false);
        setFormData({
          username: '',
          email: '',
          password: '',
          full_name: '',
          employee_id: '',
          department_id: '',
          role_id: '',
          position: 'Software Engineer',
          phone: '',
          address: '',
          date_of_birth: '',
          gender: 'Prefer not to say',
          employment_type: 'Full-Time',
          basic_salary: '5000',
          joining_date: new Date().toISOString().split('T')[0],
          bank_name: '',
          account_number: '',
          routing_number: '',
          account_holder: '',
          skills: '',
          bio: '',
        });
        fetchEmployeesData();
      } else {
        setFormError(res.message || 'Failed to create employee');
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const res = await api.updateEmployeeStatus(userId, newStatus);
      if (res.success) {
        setEmployees((prev) =>
          prev.map((e) => (e.id === userId ? { ...e, status: newStatus as any } : e))
        );
        if (selectedEmployee && selectedEmployee.id === userId) {
          setSelectedEmployee({ ...selectedEmployee, status: newStatus });
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || newTempPassword.length < 8) {
      alert('Password must be at least 8 characters long.');
      return;
    }
    try {
      const res = await api.resetEmployeePassword(selectedEmployee.id, newTempPassword);
      if (res.success) {
        alert(res.message);
        setIsResetPasswordModalOpen(false);
        setNewTempPassword('');
      }
    } catch (err: any) {
      alert(err.message || 'Password reset failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Employees Directory</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Manage company personnel, departmental assignments, roles, and profiles.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add Employee
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, ID, email, or position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
            <option value="Terminated">Terminated</option>
          </select>
        </div>
      </div>

      {/* Employees Table / Cards */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500">Retrieving employee roster from database...</p>
        </div>
      ) : employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No employees found"
          description="There are currently no employee records matching your query in the database."
          actionText={isAdmin ? 'Create Employee Account' : undefined}
          onAction={isAdmin ? () => setIsAddModalOpen(true) : undefined}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Employment</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => handleOpenDetails(emp)}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-xs shrink-0">
                          {emp.profile?.full_name?.charAt(0) || emp.username.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {emp.profile?.full_name || emp.username}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {emp.profile?.employee_id || 'ID-N/A'} • {emp.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-700">
                      {emp.department_name || (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">
                      <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">
                        {emp.role_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {emp.profile?.position || 'Staff'} ({emp.profile?.employment_type || 'Full-Time'})
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={emp.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetails(emp);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View */}
          <div className="md:hidden divide-y divide-gray-100">
            {employees.map((emp) => (
              <div
                key={emp.id}
                onClick={() => handleOpenDetails(emp)}
                className="p-4 active:bg-gray-50 cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      {emp.profile?.full_name?.charAt(0) || emp.username.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">
                        {emp.profile?.full_name || emp.username}
                      </h4>
                      <p className="text-[10px] text-gray-500">{emp.profile?.employee_id}</p>
                    </div>
                  </div>
                  <StatusBadge status={emp.status} size="sm" />
                </div>
                <div className="text-xs text-gray-600 flex justify-between">
                  <span>{emp.profile?.position || 'Staff'}</span>
                  <span className="text-gray-400">{emp.department_name || 'No Dept'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD EMPLOYEE MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Employee"
        subtitle="Provision a real staff account and record in the database."
        maxWidth="2xl"
      >
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Employee ID Code</label>
              <input
                type="text"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                placeholder="EMP-002 (leave blank to auto-generate)"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Username *</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="janedoe"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jane@company.internal"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Temporary Password *</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Min 8 characters"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Department</label>
              <select
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">System Role</label>
              <select
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
              >
                <option value="">Default (Staff / Employee)</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Position / Title</label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="Software Engineer"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Employment Type</label>
              <select
                value={formData.employment_type}
                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
              >
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Contract">Contract</option>
                <option value="Intern">Intern</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Basic Monthly Salary ($)</label>
              <input
                type="number"
                value={formData.basic_salary}
                onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
                placeholder="5000"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Joining Date</label>
              <input
                type="date"
                value={formData.joining_date}
                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Skills (comma separated)</label>
              <input
                type="text"
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                placeholder="React, Node.js, SQL"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Employee...' : 'Save & Provision Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EMPLOYEE DETAILS DRAWER */}
      {isDetailsDrawerOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-gray-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                  {selectedEmployee.profile?.full_name?.charAt(0) || selectedEmployee.username.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {selectedEmployee.profile?.full_name || selectedEmployee.username}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {selectedEmployee.profile?.employee_id} • {selectedEmployee.role_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailsDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 space-y-6 flex-1 text-xs">
              {/* Account Status Control (Admin Only) */}
              {isAdmin && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-900">Account Status</span>
                    <p className="text-[11px] text-gray-500 mt-0.5">Control login and platform access</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedEmployee.status} size="sm" />
                    <select
                      value={selectedEmployee.status}
                      onChange={(e) => handleStatusChange(selectedEmployee.id, e.target.value)}
                      className="px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Terminated">Terminated</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Performance Metrics Card */}
              {selectedEmployee.stats && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm">Activity &amp; Performance Telemetry</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg text-center">
                      <div className="text-lg font-bold text-blue-700">{selectedEmployee.stats.completedTasks}</div>
                      <div className="text-[10px] text-blue-900/80 font-medium">Tasks Completed</div>
                    </div>
                    <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-lg text-center">
                      <div className="text-lg font-bold text-purple-700">{selectedEmployee.stats.taskCompletionRate}%</div>
                      <div className="text-[10px] text-purple-900/80 font-medium">Completion Rate</div>
                    </div>
                    <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-lg text-center">
                      <div className="text-lg font-bold text-emerald-700">{selectedEmployee.stats.daysPresent}</div>
                      <div className="text-[10px] text-emerald-900/80 font-medium">Days Present</div>
                    </div>
                  </div>
                </div>
              )}

              {/* General Profile Details */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 text-sm">Employment Information</h4>
                <div className="grid grid-cols-2 gap-3 text-gray-700">
                  <div className="p-2.5 bg-gray-50 rounded-lg">
                    <span className="text-[10px] text-gray-400 block uppercase">Department</span>
                    <span className="font-semibold">{selectedEmployee.department?.name || 'Unassigned'}</span>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-lg">
                    <span className="text-[10px] text-gray-400 block uppercase">Position</span>
                    <span className="font-semibold">{selectedEmployee.profile?.position || 'N/A'}</span>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-lg">
                    <span className="text-[10px] text-gray-400 block uppercase">Joining Date</span>
                    <span className="font-semibold">{selectedEmployee.profile?.joining_date || 'N/A'}</span>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-lg">
                    <span className="text-[10px] text-gray-400 block uppercase">Employment Type</span>
                    <span className="font-semibold">{selectedEmployee.profile?.employment_type || 'Full-Time'}</span>
                  </div>
                  {isAdmin && selectedEmployee.profile?.basic_salary !== undefined && (
                    <div className="p-2.5 bg-gray-50 rounded-lg">
                      <span className="text-[10px] text-gray-400 block uppercase">Base Salary</span>
                      <span className="font-semibold text-emerald-600">
                        ${selectedEmployee.profile.basic_salary.toLocaleString()} / mo
                      </span>
                    </div>
                  )}
                  <div className="p-2.5 bg-gray-50 rounded-lg">
                    <span className="text-[10px] text-gray-400 block uppercase">Email</span>
                    <span className="font-semibold truncate block">{selectedEmployee.email}</span>
                  </div>
                </div>
              </div>

              {/* Skills */}
              {selectedEmployee.profile?.skills && selectedEmployee.profile.skills.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">Skills &amp; Capabilities</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEmployee.profile.skills.map((skill: string, i: number) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Administrative Actions */}
              {isAdmin && (
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setIsResetPasswordModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg transition cursor-pointer"
                  >
                    <Key className="w-4 h-4 text-gray-600" />
                    Reset Temporary Password
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      <Modal
        isOpen={isResetPasswordModalOpen}
        onClose={() => setIsResetPasswordModalOpen(false)}
        title="Reset Staff Password"
        subtitle={`Set temporary password for ${selectedEmployee?.profile?.full_name || selectedEmployee?.username}`}
        maxWidth="md"
      >
        <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">New Temporary Password *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={newTempPassword}
                onChange={(e) => setNewTempPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              The user will be required to change this password immediately upon their next login.
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsResetPasswordModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              Reset Password
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
