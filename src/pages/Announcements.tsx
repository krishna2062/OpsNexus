import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Announcement, Department } from '../types';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';

export const Announcements: React.FC = () => {
  const { isAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [audience, setAudience] = useState('Everyone');
  const [departmentId, setDepartmentId] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const [annRes, deptRes] = await Promise.all([
        api.getAnnouncements(),
        api.getDepartments(),
      ]);
      if (annRes.success) setAnnouncements(annRes.data || []);
      if (deptRes.success) setDepartments(deptRes.data || []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsPublishing(true);
    try {
      const res = await api.createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        priority,
        audience,
        department_id: audience === 'Department' ? departmentId : null,
      });

      if (res.success) {
        setIsModalOpen(false);
        setTitle('');
        setContent('');
        fetchAnnouncements();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert('Failed to publish announcement');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await api.deleteAnnouncement(id);
      fetchAnnouncements();
    } catch (e) {
      alert('Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Company Announcements</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Executive notices, policy memos, company updates, and operational releases.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Announcement
          </button>
        )}
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500">Querying announcements from database...</p>
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No company announcements"
          description="There are currently no active executive announcements posted."
          actionText={isAdmin ? 'Publish First Announcement' : undefined}
          onAction={isAdmin ? () => setIsModalOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      ann.priority === 'Urgent'
                        ? 'bg-rose-100 text-rose-700'
                        : ann.priority === 'High'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {ann.priority}
                  </span>
                  <span className="text-xs text-gray-400">
                    Audience: <strong>{ann.audience}</strong>
                  </span>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 rounded transition cursor-pointer"
                    title="Delete Announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <h3 className="text-base font-bold text-gray-900">{ann.title}</h3>

              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                {ann.content}
              </p>

              <div className="pt-2 text-[11px] text-gray-400 flex items-center justify-between">
                <span>Published by {ann.created_by_name}</span>
                <span>{new Date(ann.publish_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Broadcast Announcement"
        subtitle="Publish an organization notice to employees."
        maxWidth="lg"
      >
        <form onSubmit={handlePublish} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Headline Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual Company All-Hands Meeting & Performance Awards"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Target Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
              >
                <option value="Everyone">Everyone (All Staff)</option>
                <option value="Department">Specific Department</option>
              </select>
            </div>
          </div>

          {audience === 'Department' && (
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Select Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
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
          )}

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Announcement Body *</label>
            <textarea
              rows={6}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Full announcement content..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPublishing}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50"
            >
              {isPublishing ? 'Publishing...' : 'Publish Announcement'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
