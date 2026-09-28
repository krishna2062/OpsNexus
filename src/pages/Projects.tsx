import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Plus,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertTriangle,
  AlertCircle,
  UserPlus,
  Trash2,
  Edit2,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Project, User } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';

export const Projects: React.FC = () => {
  const { user, isAdmin, isProjectManager } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Create Project State
  const [formData, setFormData] = useState({
    name: '',
    project_code: '',
    description: '',
    client: '',
    start_date: new Date().toISOString().split('T')[0],
    deadline: '',
    priority: 'Medium',
    budget: '25000',
    project_manager_id: '',
    status: 'Planning',
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Member assignment state
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRoleInProj, setAssignRoleInProj] = useState('Frontend Developer');

  const fetchProjectsData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;

      const [projRes, empRes] = await Promise.all([
        api.getProjects(params),
        api.getEmployees(),
      ]);

      if (projRes.success) setProjects(projRes.data || []);
      if (empRes.success) setEmployees(empRes.data || []);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsData();
  }, [statusFilter]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setCreateError('Project name is required.');
      return;
    }
    setCreateError(null);
    setIsSubmitting(true);

    try {
      const res = await api.createProject({
        ...formData,
        budget: Number(formData.budget) || 0,
        project_manager_id: formData.project_manager_id || user?.id,
      });

      if (res.success) {
        setIsCreateModalOpen(false);
        setFormData({
          name: '',
          project_code: '',
          description: '',
          client: '',
          start_date: new Date().toISOString().split('T')[0],
          deadline: '',
          priority: 'Medium',
          budget: '25000',
          project_manager_id: '',
          status: 'Planning',
        });
        fetchProjectsData();
      } else {
        setCreateError(res.message);
      }
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenMembers = async (proj: Project) => {
    try {
      const res = await api.getProjectById(proj.id);
      if (res.success) {
        setSelectedProject(res.data);
        setIsMemberModalOpen(true);
      }
    } catch (err) {
      alert('Failed to load project details');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !assignUserId) return;

    try {
      const res = await api.addProjectMember(selectedProject.id, {
        user_id: assignUserId,
        role_in_project: assignRoleInProj,
      });

      if (res.success) {
        handleOpenMembers(selectedProject);
        fetchProjectsData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to assign member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedProject) return;
    if (!confirm('Remove member from this project?')) return;

    try {
      const res = await api.removeProjectMember(selectedProject.id, userId);
      if (res.success) {
        handleOpenMembers(selectedProject);
        fetchProjectsData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete project '${name}'? All related tasks will also be removed.`)) return;
    try {
      const res = await api.deleteProject(id);
      if (res.success) {
        fetchProjectsData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Projects Pipeline</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Deliverables tracking, client accounts, task progress computation, and squad distribution.
          </p>
        </div>

        {isProjectManager && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex gap-2 sm:gap-4 overflow-x-auto">
          {['', 'Planning', 'Pending', 'In Progress', 'Review', 'Completed', 'On Hold'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`pb-3 text-xs sm:text-sm font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {st || 'All Projects'}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500">Querying projects from database...</p>
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects found"
          description="There are currently no company projects recorded for this view in the database."
          actionText={isProjectManager ? 'Create Company Project' : undefined}
          onAction={isProjectManager ? () => setIsCreateModalOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs hover:border-gray-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                      {proj.project_code}
                    </span>
                    <h3 className="font-bold text-gray-900 text-base leading-tight mt-0.5">
                      {proj.name}
                    </h3>
                  </div>
                  <StatusBadge status={proj.status} size="sm" />
                </div>

                <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                  {proj.description || 'No project description documented.'}
                </p>

                {proj.client && (
                  <p className="text-[11px] text-gray-400 mt-2">
                    Client: <span className="text-gray-700 font-medium">{proj.client}</span>
                  </p>
                )}

                {/* Dynamic Progress Bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-gray-700">
                    <span>Task Progress</span>
                    <span>{proj.progress_percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${proj.progress_percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>
                      {proj.completed_tasks_count || 0} / {proj.total_tasks_count || 0} tasks finished
                    </span>
                    <span>{proj.team_members_count || 0} members assigned</span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 block">Project Lead</span>
                  <span className="font-semibold text-gray-800">{proj.project_manager_name}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {isProjectManager && (
                    <button
                      onClick={() => handleOpenMembers(proj)}
                      className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                      title="Manage Squad / Distribution"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteProject(proj.id, proj.name)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Project"
        subtitle="Establish an authorized company project deliverable."
        maxWidth="2xl"
      >
        {createError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{createError}</span>
          </div>
        )}

        <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Project Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enterprise Customer Portal"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Project Code</label>
              <input
                type="text"
                value={formData.project_code}
                onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                placeholder="PRJ-001 (auto-generated if empty)"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Scope, objectives, and deliverables..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Client / Stakeholder</label>
              <input
                type="text"
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                placeholder="Internal or Client Name"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Project Lead / PM</label>
              <select
                value={formData.project_manager_id}
                onChange={(e) => setFormData({ ...formData, project_manager_id: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
              >
                <option value="">Current User</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.profile?.full_name || emp.username}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Deadline Date</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Budget ($)</label>
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="25000"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Project...' : 'Initialize Project'}
            </button>
          </div>
        </form>
      </Modal>

      {/* SQUAD DISTRIBUTION & MEMBERS MODAL */}
      <Modal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        title={`Project Squad Distribution`}
        subtitle={`Allocate responsibilities for ${selectedProject?.name}`}
        maxWidth="lg"
      >
        <div className="space-y-5 text-xs">
          {/* Add member form */}
          <form onSubmit={handleAddMember} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
            <div className="font-semibold text-gray-900">Distribute New Responsibility</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Assign Employee</label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.profile?.full_name || emp.username} ({emp.profile?.position || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Project Role / Responsibility</label>
                <input
                  type="text"
                  value={assignRoleInProj}
                  onChange={(e) => setAssignRoleInProj(e.target.value)}
                  placeholder="e.g. UI Designer, Frontend Developer, QA"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!assignUserId}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
            >
              Assign to Squad
            </button>
          </form>

          {/* Members list */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Current Project Squad</h4>
            <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
              {(selectedProject as any)?.members?.length === 0 ? (
                <p className="text-gray-400 py-4 text-center">No squad members assigned yet.</p>
              ) : (
                (selectedProject as any)?.members?.map((m: any) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-900">{m.user_name}</span>
                      <span className="text-[11px] text-blue-600 block">{m.role_in_project}</span>
                    </div>

                    <button
                      onClick={() => handleRemoveMember(m.user_id)}
                      className="p-1 text-gray-400 hover:text-rose-600 rounded transition cursor-pointer"
                      title="Remove Member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
