import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
  Users,
  Paperclip,
  Trash2,
  Smile,
  Hash,
  User,
  FolderKanban,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Conversation, Message, User as UserType } from '../types';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';

export const TeamChat: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [employees, setEmployees] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);

  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isNewConvModalOpen, setIsNewConvModalOpen] = useState(false);
  const [newDirectUserId, setNewDirectUserId] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      const [convRes, empRes] = await Promise.all([
        api.getConversations(),
        api.getEmployees(),
      ]);
      if (convRes.success) {
        setConversations(convRes.data || []);
        if (convRes.data?.length > 0 && !activeConv) {
          setActiveConv(convRes.data[0]);
        }
      }
      if (empRes.success) setEmployees(empRes.data || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await api.getMessages(convId);
      if (res.success) {
        setMessages(res.data || []);
      }
    } catch (e) {
      // quiet
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv.id);
      const interval = setInterval(() => fetchMessages(activeConv.id), 4000);
      return () => clearInterval(interval);
    }
  }, [activeConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !messageText.trim()) return;

    setIsSending(true);
    const content = messageText.trim();
    setMessageText('');

    try {
      const res = await api.sendMessage(activeConv.id, {
        content,
        message_type: 'text',
      });
      if (res.success) {
        setMessages((prev) => [...prev, res.data]);
        fetchConversations();
      }
    } catch (err) {
      alert('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleStartDirectChat = async () => {
    if (!newDirectUserId) return;
    try {
      const res = await api.createConversation({
        type: 'direct',
        recipient_id: newDirectUserId,
      });
      if (res.success) {
        setIsNewConvModalOpen(false);
        setActiveConv(res.data);
        fetchConversations();
      }
    } catch (e) {
      alert('Failed to start chat');
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await api.deleteMessage(msgId);
      if (activeConv) fetchMessages(activeConv.id);
    } catch (e) {
      alert('Failed to delete message');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Real-Time Team Chat</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Synchronous internal collaboration channels, project squads, and direct communications.
          </p>
        </div>

        <button
          onClick={() => setIsNewConvModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Direct Message
        </button>
      </div>

      {/* Chat Layout Container */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex h-[620px]">
        {/* Left: Channels & Chats List */}
        <div className="w-72 border-r border-gray-200 bg-slate-50/50 flex flex-col">
          <div className="p-3.5 border-b border-gray-200 font-bold text-xs text-gray-700 flex items-center justify-between">
            <span>Conversations</span>
            <span className="text-[10px] text-gray-400 font-normal">{conversations.length} total</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">No active conversations.</div>
            ) : (
              conversations.map((c) => {
                const isActive = activeConv?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveConv(c)}
                    className={`w-full p-2.5 rounded-lg text-left transition cursor-pointer flex items-center gap-3 ${
                      isActive ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {c.type === 'project' ? (
                        <FolderKanban className="w-4 h-4" />
                      ) : c.type === 'department' ? (
                        <Building2 className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-900 truncate">{c.title}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {c.last_message || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Message Stream */}
        <div className="flex-1 flex flex-col bg-slate-50/20">
          {activeConv ? (
            <>
              {/* Active Header */}
              <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{activeConv.title}</h3>
                  <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Realtime Channel
                  </p>
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400">
                    No messages yet in this conversation. Say hello!
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender_id === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-semibold text-gray-500">
                            {isMe ? 'You' : m.sender_name}
                          </span>
                          <span className="text-[9px] text-gray-400">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && (
                            <button
                              onClick={() => handleDeleteMessage(m.id)}
                              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-rose-500 transition cursor-pointer"
                              title="Delete message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div
                          className={`max-w-md px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                            isMe
                              ? 'bg-blue-600 text-white rounded-br-xs'
                              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-xs shadow-2xs'
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Compose Bar */}
              <div className="p-3 bg-white border-t border-gray-200">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !messageText.trim()}
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <EmptyState
                icon={MessageSquare}
                title="Select a channel"
                description="Pick a conversation from the left pane or start a direct message."
              />
            </div>
          )}
        </div>
      </div>

      {/* NEW DIRECT CHAT MODAL */}
      <Modal
        isOpen={isNewConvModalOpen}
        onClose={() => setIsNewConvModalOpen(false)}
        title="Start Direct Chat"
        subtitle="Initiate a secure 1-on-1 discussion with a team colleague."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Select Colleague</label>
            <select
              value={newDirectUserId}
              onChange={(e) => setNewDirectUserId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
            >
              <option value="">Select an employee...</option>
              {employees
                .filter((e) => e.id !== user?.id)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.profile?.full_name || e.username} ({e.profile?.position || 'Staff'})
                  </option>
                ))}
            </select>
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewConvModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!newDirectUserId}
              onClick={handleStartDirectChat}
              className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Start Conversation
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
