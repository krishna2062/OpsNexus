import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  MessageSquare,
  Paperclip,
  CheckCircle,
  RotateCcw,
  Send,
  User,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Task, Project, User as UserType } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';

export const Tasks: React.FC = () => {
  const { user, isAdmin, isProjectManager, isTeamLead } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);

  // Create Task Form
  const [formData, setFormData] = useState({
    project_id: '',
    title: '',
    description: '',
    assigned_to: '',
    priority: 'Medium',
    deadline: '',
    estimated_hours: '8',
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Task Action States (Submitting Work & Reviewing)
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [commentText, setCommentText] = useState('');

  const fetchTasksData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (projectFilter) params.project_id = projectFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const [tasksRes, projRes, empRes] = await Promise.all([
        api.getTasks(params),
        api.getProjects(),
        api.getEmployees(),
      ]);

      if (tasksRes.success) setTasks(tasksRes.data || []);
      if (projRes.success) {
        setProjects(projRes.data || []);
        if (projRes.data?.length > 0 && !formData.project_id) {
          setFormData((prev) => ({ ...prev, project_id: projRes.data[0].id }));
        }
      }
      if (empRes.success) setEmployees(empRes.data || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksData();
  }, [statusFilter, projectFilter, priorityFilter]);

  const handleOpenTask = async (task: Task) => {
    try {
      const res = await api.getTaskById(task.id);
      if (res.success) {
        setSelectedTask(res.data);
        setIsTaskDetailsOpen(true);
      }
    } catch (err) {
      alert('Failed to load task details');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_id || !formData.title.trim()) {
      setCreateError('Project and title are required.');
      return;
    }
    setCreateError(null);
    setIsSubmitting(true);

    try {
      const res = await api.createTask({
        ...formData,
        estimated_hours: Number(formData.estimated_hours) || 0,
      });

      if (res.success) {
        setIsCreateModalOpen(false);
        setFormData({
          project_id: projects[0]?.id || '',
          title: '',
          description: '',
          assigned_to: '',
          priority: 'Medium',
          deadline: '',
          estimated_hours: '8',
        });
        fetchTasksData();
      } else {
        setCreateError(res.message);
      }
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Workflow Status Updates
  const handleUpdateWorkflowStatus = async (status: string, extraData: any = {}) => {
    if (!selectedTask) return;
    try {
      const res = await api.updateTaskStatus(selectedTask.id, {
        status,
        ...extraData,
      });
      if (res.success) {
        handleOpenTask(selectedTask);
        fetchTasksData();
      }
    } catch (err: any) {
      alert(err.message || 'Status transition failed');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !commentText.trim()) return;

    try {
      const res = await api.addTaskComment(selectedTask.id, commentText.trim());
      if (res.success) {
        setCommentText('');
        handleOpenTask(selectedTask);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add comment');
    }
  };

  const isAssignee = selectedTask && selectedTask.assigned_to === user?.id;
  const canManage = isAdmin || isProjectManager || isTeamLead || (selectedTask && selectedTask.assigned_by === user?.id);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Task Management</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Operational assignments, execution lifecycle, submission reviews, and progress tracking.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex gap-2 sm:gap-4 overflow-x-auto">
          {['', 'Pending', 'In Progress', 'Submitted for Review', 'Completed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`pb-1 text-xs sm:text-sm font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {st || 'All Tasks'}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-700"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-700"
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Tasks Table / Board */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500">Querying tasks from database...</p>
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks assigned"
          description="There are currently no tasks matching your filters in the database."
          actionText={canManage ? 'Create First Task' : undefined}
          onAction={canManage ? () => setIsCreateModalOpen(true) : undefined}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Code &amp; Title</th>
                  <th className="px-6 py-3.5">Project</th>
                  <th className="px-6 py-3.5">Assignee</th>
                  <th className="px-6 py-3.5">Priority</th>
                  <th className="px-6 py-3.5">Progress</th>
                  <th className="px-6 py-3.5">Deadline</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => handleOpenTask(task)}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{task.title}</div>
                      <div className="text-[10px] text-gray-400">{task.task_code}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-700">{task.project_name}</td>
                    <td className="px-6 py-4 text-gray-700">
                      <span className="font-medium">{task.assigned_to_name || 'Unassigned'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-semibold ${
                          task.priority === 'Urgent'
                            ? 'text-rose-600'
                            : task.priority === 'High'
                            ? 'text-amber-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ width: `${task.progress_percentage}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-gray-600">{task.progress_percentage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {task.deadline ? (
                        new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={task.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenTask(task);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Assign New Task"
        subtitle="Establish an operational assignment with deadline and priority."
        maxWidth="xl"
      >
        {createError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{createError}</span>
          </div>
        )}

        <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Target Project *</label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.project_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Assigned Employee</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
              >
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.profile?.full_name || emp.username} ({emp.profile?.position || 'Staff'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Task Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Implement OAuth Flow / Refactor Database Queries"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Requirements &amp; Instructions</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Technical specifications, criteria of acceptance..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <label className="block font-semibold text-gray-700 mb-1">Estimated Hours</label>
              <input
                type="number"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
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
              {isSubmitting ? 'Creating...' : 'Assign Task'}
            </button>
          </div>
        </form>
      </Modal>

      {/* TASK WORKFLOW DRAWER */}
      {isTaskDetailsOpen && selectedTask && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-gray-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                  {selectedTask.task_code} • {selectedTask.project_name}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setIsTaskDetailsOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Workflow Control Bar */}
            <div className="p-4 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Status:</span>
                <StatusBadge status={selectedTask.status} size="sm" />
              </div>

              {/* Lifecycle Transitions */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Staff: Accept task */}
                {isAssignee && selectedTask.status === 'Pending' && (
                  <button
                    onClick={() => handleUpdateWorkflowStatus('Accepted', { progress_percentage: 10 })}
                    className="px-3 py-1.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 cursor-pointer"
                  >
                    Accept Task
                  </button>
                )}

                {/* Staff: Start task */}
                {isAssignee && selectedTask.status === 'Accepted' && (
                  <button
                    onClick={() => handleUpdateWorkflowStatus('In Progress', { progress_percentage: 25 })}
                    className="px-3 py-1.5 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 cursor-pointer"
                  >
                    Start Working
                  </button>
                )}

                {/* Staff: Submit work for review */}
                {isAssignee && (selectedTask.status === 'In Progress' || selectedTask.status === 'Revision Required') && (
                  <button
                    onClick={() => {
                      const notes = prompt('Enter work submission remarks:') || '';
                      handleUpdateWorkflowStatus('Submitted for Review', { submission_notes: notes });
                    }}
                    className="px-3 py-1.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 cursor-pointer"
                  >
                    Submit for Review
                  </button>
                )}

                {/* Manager / Admin: Review actions */}
                {canManage && selectedTask.status === 'Submitted for Review' && (
                  <>
                    <button
                      onClick={() => {
                        const feedback = prompt('Revision instructions for assignee:') || '';
                        handleUpdateWorkflowStatus('Revision Required', { review_feedback: feedback });
                      }}
                      className="px-3 py-1.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 cursor-pointer"
                    >
                      Request Revision
                    </button>
                    <button
                      onClick={() => handleUpdateWorkflowStatus('Completed', { progress_percentage: 100 })}
                      className="px-3 py-1.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 cursor-pointer"
                    >
                      Approve &amp; Complete
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Task Details Content */}
            <div className="p-6 space-y-6 flex-1 text-xs">
              {/* Progress Slider (Assignee or Manager) */}
              {(isAssignee || canManage) && selectedTask.status !== 'Completed' && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex justify-between font-semibold text-gray-700 mb-2">
                    <span>Task Completion Progress</span>
                    <span>{selectedTask.progress_percentage}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={selectedTask.progress_percentage}
                    onChange={(e) =>
                      handleUpdateWorkflowStatus(selectedTask.status, {
                        progress_percentage: Number(e.target.value),
                      })
                    }
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-1 text-sm">Task Description</h4>
                <p className="text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {selectedTask.description || 'No detailed instructions provided.'}
                </p>
              </div>

              {/* Submission Notes */}
              {selectedTask.submission_notes && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <span className="font-bold text-blue-950 block mb-1">Work Submission Notes:</span>
                  <p className="text-blue-900">{selectedTask.submission_notes}</p>
                </div>
              )}

              {/* Review Feedback */}
              {selectedTask.review_feedback && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <span className="font-bold text-amber-950 block mb-1">Manager Feedback:</span>
                  <p className="text-amber-900">{selectedTask.review_feedback}</p>
                </div>
              )}

              {/* Metadata Info */}
              <div className="grid grid-cols-2 gap-3 text-gray-700">
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-[10px] text-gray-400 block uppercase">Assignee</span>
                  <span className="font-semibold">{selectedTask.assigned_to_name}</span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-[10px] text-gray-400 block uppercase">Assigned By</span>
                  <span className="font-semibold">{selectedTask.assigned_by_name}</span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-[10px] text-gray-400 block uppercase">Deadline</span>
                  <span className="font-semibold">{selectedTask.deadline || 'No deadline'}</span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-[10px] text-gray-400 block uppercase">Hours Logged</span>
                  <span className="font-semibold">
                    {selectedTask.actual_hours} / {selectedTask.estimated_hours} hrs
                  </span>
                </div>
              </div>

              {/* Comments Section */}
              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" /> Comments &amp; Discussion
                </h4>

                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                  {selectedTask.comments?.length === 0 ? (
                    <p className="text-gray-400 italic">No comments posted yet.</p>
                  ) : (
                    selectedTask.comments?.map((c: any) => (
                      <div key={c.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex justify-between font-semibold text-gray-900 mb-1">
                          <span>{c.user_name}</span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-gray-700">{c.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a message or update..."
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
