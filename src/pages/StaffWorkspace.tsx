import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  CheckSquare,
  Clock,
  Calendar,
  AlertTriangle,
  FolderKanban,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Task, Project } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';

export const StaffWorkspace: React.FC<{ onNavigateTab: (tab: string) => void }> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchWorkspaceData = async () => {
    setLoading(true);
    try {
      const [tasksRes, projRes] = await Promise.all([
        api.getTasks({ assigned_to: user?.id || '' }),
        api.getProjects(),
      ]);

      if (tasksRes.success) setTasks(tasksRes.data || []);
      if (projRes.success) setProjects(projRes.data || []);
    } catch (err) {
      console.error('Failed to load workspace data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, []);

  const handleUpdateProgress = async (taskId: string, currentStatus: string, progress: number) => {
    try {
      let nextStatus = currentStatus;
      if (currentStatus === 'Pending' && progress > 0) nextStatus = 'Accepted';
      if ((currentStatus === 'Accepted' || currentStatus === 'Pending') && progress >= 20) nextStatus = 'In Progress';

      await api.updateTaskStatus(taskId, {
        status: nextStatus,
        progress_percentage: progress,
      });
      fetchWorkspaceData();
    } catch (e) {
      alert('Failed to update progress');
    }
  };

  const handleQuickSubmit = async (taskId: string) => {
    const notes = prompt('Enter your work submission comments:') || '';
    try {
      await api.updateTaskStatus(taskId, {
        status: 'Submitted for Review',
        submission_notes: notes,
      });
      fetchWorkspaceData();
    } catch (e) {
      alert('Failed to submit work');
    }
  };

  const pendingTasks = tasks.filter((t) => t.status === 'Pending');
  const inProgressTasks = tasks.filter((t) => t.status === 'In Progress' || t.status === 'Accepted');
  const submittedTasks = tasks.filter((t) => t.status === 'Submitted for Review');
  const completedTasks = tasks.filter((t) => t.status === 'Completed');
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueTasks = tasks.filter((t) => t.deadline && t.deadline < todayStr && t.status !== 'Completed');

  const filteredTasks = statusFilter ? tasks.filter((t) => t.status === statusFilter) : tasks;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Personal Workspace</h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
          Your active deliverables, deadline timelines, project squads, and task submissions.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div
          onClick={() => setStatusFilter('Pending')}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs cursor-pointer hover:border-blue-400 transition"
        >
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pending</span>
          <div className="text-2xl font-bold text-gray-900 mt-1">{pendingTasks.length}</div>
          <p className="text-[11px] text-gray-500">Require acceptance</p>
        </div>

        <div
          onClick={() => setStatusFilter('In Progress')}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs cursor-pointer hover:border-purple-400 transition"
        >
          <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">In Progress</span>
          <div className="text-2xl font-bold text-purple-700 mt-1">{inProgressTasks.length}</div>
          <p className="text-[11px] text-gray-500">Currently active</p>
        </div>

        <div
          onClick={() => setStatusFilter('Submitted for Review')}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs cursor-pointer hover:border-amber-400 transition"
        >
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Submitted</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{submittedTasks.length}</div>
          <p className="text-[11px] text-gray-500">Under review</p>
        </div>

        <div
          onClick={() => setStatusFilter('Completed')}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs cursor-pointer hover:border-emerald-400 transition"
        >
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Completed</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{completedTasks.length}</div>
          <p className="text-[11px] text-gray-500">Successfully closed</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Overdue</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">{overdueTasks.length}</div>
          <p className="text-[11px] text-gray-500">Past target date</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: My Assigned Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              My Assigned Deliverables {statusFilter && `(${statusFilter})`}
            </h3>
            {statusFilter && (
              <button
                onClick={() => setStatusFilter('')}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                Clear filter
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-gray-500">Loading your tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No tasks assigned"
              description="You have no tasks matching this criteria assigned to your account in the database."
            />
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs hover:border-gray-300 transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-blue-600">{task.task_code}</span>
                        <span className="text-[11px] text-gray-400">• {task.project_name}</span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 mt-0.5">{task.title}</h4>
                    </div>
                    <StatusBadge status={task.status} size="sm" />
                  </div>

                  {task.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
                  )}

                  {/* Progress Control */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600 font-medium">
                      <span>Progress</span>
                      <span>{task.progress_percentage}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      disabled={task.status === 'Completed'}
                      value={task.progress_percentage}
                      onChange={(e) =>
                        handleUpdateProgress(task.id, task.status, Number(e.target.value))
                      }
                      className="w-full accent-blue-600 cursor-pointer disabled:opacity-50"
                    />
                  </div>

                  {/* Task Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                    <div className="flex items-center gap-3 text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {task.deadline || 'No deadline'}
                      </span>
                      <span>Priority: <strong className="text-gray-700">{task.priority}</strong></span>
                    </div>

                    <div>
                      {task.status === 'Pending' && (
                        <button
                          onClick={() => handleUpdateProgress(task.id, 'Accepted', 10)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium cursor-pointer"
                        >
                          Accept
                        </button>
                      )}
                      {(task.status === 'Accepted' || task.status === 'In Progress') && (
                        <button
                          onClick={() => handleQuickSubmit(task.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium cursor-pointer"
                        >
                          Submit Work
                        </button>
                      )}
                      {task.status === 'Completed' && (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Approved
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: My Projects */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-indigo-600" />
            My Active Projects
          </h3>

          {projects.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center text-xs text-gray-400">
              No projects distributed to your squad yet.
            </div>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 4).map((p) => (
                <div key={p.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-indigo-600">{p.project_code}</span>
                    <StatusBadge status={p.status} size="sm" />
                  </div>
                  <h4 className="text-xs font-bold text-gray-900">{p.name}</h4>
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                      <span>Completion</span>
                      <span>{p.progress_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full"
                        style={{ width: `${p.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
