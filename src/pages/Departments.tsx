import React, { useState, useEffect } from 'react';
import { Building2, Plus, Users, UserCheck, Edit3, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Department, User } from '../types';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { StatusBadge } from '../components/common/StatusBadge';

export const Departments: React.FC = () => {
  const { isAdmin } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [headId, setHeadId] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const [deptRes, empRes] = await Promise.all([
        api.getDepartments(),
        api.getEmployees(),
      ]);
      if (deptRes.success) setDepartments(deptRes.data || []);
      if (empRes.success) setEmployees(empRes.data || []);
    } catch (err) {
      console.error('Failed to load departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openCreateModal = () => {
    setEditingDept(null);
    setName('');
    setDescription('');
    setHeadId('');
    setStatus('Active');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setName(dept.name);
    setDescription(dept.description || '');
    setHeadId(dept.department_head_id || '');
    setStatus(dept.status);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Department name is required.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        department_head_id: headId || null,
        status,
      };

      if (editingDept) {
        const res = await api.updateDepartment(editingDept.id, payload);
        if (res.success) {
          setIsModalOpen(false);
          fetchDepartments();
        } else {
          setError(res.message);
        }
      } else {
        const res = await api.createDepartment(payload);
        if (res.success) {
          setIsModalOpen(false);
          fetchDepartments();
        } else {
          setError(res.message);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (dept: Department) => {
    if (!confirm(`Are you sure you want to delete the '${dept.name}' department?`)) return;
    try {
      const res = await api.deleteDepartment(dept.id);
      if (res.success) {
        fetchDepartments();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete department');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Departments</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Organize teams, assign department leadership, and track workforce distribution.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Department
          </button>
        )}
      </div>

      {/* Departments Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500">Querying departments from database...</p>
        </div>
      ) : departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No departments found"
          description="There are currently no company departments registered in the database."
          actionText={isAdmin ? 'Create First Department' : undefined}
          onAction={isAdmin ? openCreateModal : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs hover:border-gray-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">
                        {dept.name}
                      </h3>
                      <StatusBadge status={dept.status} size="sm" />
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(dept)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-gray-100 transition cursor-pointer"
                        title="Edit Department"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(dept)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded-md hover:bg-gray-100 transition cursor-pointer"
                        title="Delete Department"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-500 line-clamp-2 mt-2">
                  {dept.description || 'No departmental charter description provided.'}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-600">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                    Department Head:
                  </span>
                  <span className="font-semibold text-gray-900">
                    {dept.department_head_name || 'Not assigned'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-gray-600">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    Members:
                  </span>
                  <span className="font-semibold text-blue-600">
                    {dept.member_count || 0} staff members
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDept ? 'Edit Department' : 'Create New Department'}
        subtitle="Manage company structural division in the database."
        maxWidth="md"
      >
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Department Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering, Product Design, Finance, HR"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Responsibilities and charter of this department..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Department Head</label>
            <select
              value={headId}
              onChange={(e) => setHeadId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
            >
              <option value="">Select an employee (Optional)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.profile?.full_name || emp.username} ({emp.profile?.position || 'Staff'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
