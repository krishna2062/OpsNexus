import React, { useState, useEffect } from 'react';
import {
  Mail,
  Inbox,
  Send,
  FileEdit,
  Archive,
  Trash2,
  Plus,
  Search,
  Paperclip,
  ArrowLeft,
  Reply,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { InternalEmail, User } from '../types';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';

export const InternalMail: React.FC = () => {
  const { user } = useAuth();
  const [currentBox, setCurrentBox] = useState<'inbox' | 'sent' | 'drafts' | 'archived' | 'trash'>('inbox');
  const [emails, setEmails] = useState<InternalEmail[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Read view
  const [activeEmail, setActiveEmail] = useState<InternalEmail | null>(null);

  // Compose Modal
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const [mailRes, empRes] = await Promise.all([
        api.getEmails(currentBox, search),
        api.getEmployees(),
      ]);

      if (mailRes.success) {
        setEmails(mailRes.data || []);
        if (mailRes.unreadInboxCount !== undefined) setUnreadCount(mailRes.unreadInboxCount);
      }
      if (empRes.success) setEmployees(empRes.data || []);
    } catch (err) {
      console.error('Failed to load internal mail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [currentBox, search]);

  const handleOpenEmail = async (email: InternalEmail) => {
    try {
      const res = await api.getEmailById(email.id);
      if (res.success) {
        setActiveEmail(res.data);
        setEmails((prev) =>
          prev.map((e) => (e.id === email.id ? { ...e, is_read: true } : e))
        );
      }
    } catch (e) {
      alert('Failed to read message');
    }
  };

  const handleSendEmail = async (isDraft = false) => {
    if (!isDraft && (!recipientId || !subject.trim() || !body.trim())) {
      alert('Recipient, subject, and body are required.');
      return;
    }
    setIsSending(true);

    try {
      const res = await api.sendEmail({
        recipient_id: recipientId,
        subject: subject.trim(),
        body: body.trim(),
        is_draft: isDraft,
      });

      if (res.success) {
        setIsComposeOpen(false);
        setRecipientId('');
        setSubject('');
        setBody('');
        fetchEmails();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleEmailAction = async (id: string, action: 'archive' | 'unarchive' | 'trash' | 'restore') => {
    try {
      await api.updateEmailStatus(id, { action });
      setActiveEmail(null);
      fetchEmails();
    } catch (err) {
      alert('Failed to update email');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Internal Company Mail</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Confidential company communications, internal memorandums, and team dispatches.
          </p>
        </div>

        <button
          onClick={() => {
            setActiveEmail(null);
            setIsComposeOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Compose Message
        </button>
      </div>

      {/* Main Mail Container */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex flex-col md:flex-row min-h-[550px]">
        {/* Mail Navigation Sidebar */}
        <div className="w-full md:w-56 p-4 border-b md:border-b-0 md:border-r border-gray-200 bg-slate-50/60 space-y-1 text-xs">
          {[
            { id: 'inbox', label: 'Inbox', icon: Inbox, count: unreadCount },
            { id: 'sent', label: 'Sent Messages', icon: Send },
            { id: 'drafts', label: 'Drafts', icon: FileEdit },
            { id: 'archived', label: 'Archived', icon: Archive },
            { id: 'trash', label: 'Trash', icon: Trash2 },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = currentBox === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentBox(item.id as any);
                  setActiveEmail(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.count && item.count > 0 ? (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white text-blue-600 font-bold' : 'bg-blue-100 text-blue-700 font-semibold'}`}>
                    {item.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Mail Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeEmail ? (
            /* Email Reading View */
            <div className="flex-1 p-6 space-y-6 flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <button
                  onClick={() => setActiveEmail(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to {currentBox}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEmailAction(activeEmail.id, 'archive')}
                    className="p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    title="Archive"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEmailAction(activeEmail.id, 'trash')}
                    className="p-1.5 text-gray-500 hover:text-rose-600 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900">{activeEmail.subject}</h3>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <div>
                    <span className="font-semibold text-gray-900">
                      From: {activeEmail.sender_name} ({activeEmail.sender_email})
                    </span>
                    <span className="block mt-0.5">To: {activeEmail.recipient_name} ({activeEmail.recipient_email})</span>
                  </div>
                  <span>{new Date(activeEmail.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex-1 text-xs text-gray-800 leading-relaxed whitespace-pre-line py-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                {activeEmail.body}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setRecipientId(activeEmail.sender_id);
                    setSubject(`Re: ${activeEmail.subject}`);
                    setIsComposeOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  <Reply className="w-4 h-4" />
                  Reply
                </button>
              </div>
            </div>
          ) : (
            /* Email List View */
            <div className="flex-1 flex flex-col">
              {/* Search Bar */}
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Search ${currentBox}...`}
                    className="w-full pl-8 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              {loading ? (
                <div className="py-20 text-center text-xs text-gray-400">Loading messages...</div>
              ) : emails.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <EmptyState
                    icon={Mail}
                    title={`No messages in ${currentBox}`}
                    description="Your internal communications folder is currently empty."
                  />
                </div>
              ) : (
                <div className="divide-y divide-gray-100 overflow-y-auto">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => handleOpenEmail(email)}
                      className={`p-4 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between gap-4 text-xs ${
                        !email.is_read && currentBox === 'inbox' ? 'bg-blue-50/40 font-semibold' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 truncate">
                            {currentBox === 'sent' ? `To: ${email.recipient_name}` : email.sender_name}
                          </span>
                          {!email.is_read && currentBox === 'inbox' && (
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                          )}
                        </div>
                        <p className="text-gray-800 font-medium truncate mt-0.5">{email.subject}</p>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">{email.body}</p>
                      </div>

                      <div className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">
                        {new Date(email.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* COMPOSE MODAL */}
      <Modal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        title="Compose Internal Message"
        subtitle="Send communication to colleagues within OpsNexus."
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Recipient *</label>
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
            >
              <option value="">Select Employee</option>
              {employees
                .filter((emp) => emp.id !== user?.id)
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.profile?.full_name || emp.username} ({emp.email})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Q4 Sprint Planning Meeting Notice"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Message Body *</label>
            <textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your internal memo or communication..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500 font-mono text-xs"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleSendEmail(true)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer font-medium"
            >
              Save as Draft
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={isSending}
                onClick={() => handleSendEmail(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
