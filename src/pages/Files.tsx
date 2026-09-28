import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Folder,
  File,
  Search,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { FileRecord } from '../types';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';

export const Files: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');

  // Upload Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('Company documents');
  const [accessLevel, setAccessLevel] = useState('Company');
  const [isUploading, setIsUploading] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedCategory) params.category = selectedCategory;
      if (search) params.search = search;
      const res = await api.getFiles(params);
      if (res.success) setFiles(res.data || []);
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [selectedCategory, search]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileObj) {
      alert('Please select a file to upload.');
      return;
    }
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadFileObj);
      formData.append('category', uploadCategory);
      formData.append('access_level', accessLevel);

      const res = await api.uploadFile(formData);
      if (res.success) {
        setIsUploadModalOpen(false);
        setUploadFileObj(null);
        fetchFiles();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      await api.deleteFile(id);
      fetchFiles();
    } catch (e) {
      alert('Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Document &amp; File Vault</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Centralized company repositories, policies, employee files, and project assets.
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Filter Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex gap-2 sm:gap-4 overflow-x-auto">
          {[
            '',
            'Company documents',
            'Project documents',
            'Task attachments',
            'Employee documents',
            'Payroll documents',
          ].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`pb-1 text-xs sm:text-sm font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {cat || 'All Documents'}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vault..."
            className="pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-hidden"
          />
        </div>
      </div>

      {/* File Vault Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500">Querying files from storage vault...</p>
        </div>
      ) : files.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents found"
          description="There are currently no files recorded in the document vault for this category."
          actionText="Upload First Document"
          onAction={() => setIsUploadModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs hover:border-gray-300 transition flex flex-col justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <File className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-gray-900 truncate" title={file.original_name}>
                    {file.original_name}
                  </h4>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    {file.category} • {(file.file_size / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-[10px] text-gray-400 truncate">
                  Uploaded by {file.uploaded_by_name}
                </span>

                <div className="flex items-center gap-1">
                  <a
                    href={file.storage_path}
                    download={file.original_name}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-gray-100 transition cursor-pointer"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  {(isAdmin || file.uploaded_by === user?.id) && (
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-1.5 text-gray-500 hover:text-rose-600 rounded hover:bg-gray-100 transition cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* UPLOAD MODAL */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Document to Vault"
        subtitle="Store persistent documents securely."
        maxWidth="md"
      >
        <form onSubmit={handleUpload} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Select File *</label>
            <input
              type="file"
              required
              onChange={(e) => setUploadFileObj(e.target.files?.[0] || null)}
              className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Category</label>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
            >
              <option value="Company documents">Company documents</option>
              <option value="Project documents">Project documents</option>
              <option value="Task attachments">Task attachments</option>
              <option value="Employee documents">Employee documents</option>
              <option value="Payroll documents">Payroll documents</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Access Level</label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
            >
              <option value="Company">Company (All Employees)</option>
              <option value="Private">Private (Management Only)</option>
            </select>
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !uploadFileObj}
              className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
