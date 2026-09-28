import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Building,
  Database,
  Shield,
  Key,
  CheckCircle,
  AlertCircle,
  Copy,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const Settings: React.FC = () => {
  const { user, isAdmin, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<'company' | 'database' | 'security'>('company');

  // Company Profile
  const [companyProfile, setCompanyProfile] = useState<any>({
    name: 'OpsNexus Enterprise Technologies',
    legalName: 'OpsNexus Corp Inc.',
    email: 'admin@opsnexus.internal',
    phone: '+1 (555) 019-2834',
    address: '100 Enterprise Way, Suite 400, Tech District, CA',
    timezone: 'America/Los_Angeles',
    workStart: '09:00',
    workEnd: '18:00',
    currency: 'USD',
  });
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [companySaveSuccess, setCompanySaveSuccess] = useState(false);

  // Database & Supabase Status
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [supabaseSql, setSupabaseSql] = useState<{ schemaSql?: string; policiesSql?: string; functionsSql?: string }>({});
  const [activeSqlTab, setActiveSqlTab] = useState<'schema' | 'policies' | 'functions'>('schema');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Security / Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [setRes, sqlRes] = await Promise.all([
          api.getSettings(),
          api.getSupabaseSql(),
        ]);
        if (setRes.success && setRes.data) {
          if (setRes.data.companyProfile) setCompanyProfile(setRes.data.companyProfile);
          if (setRes.data.supabase) setSupabaseStatus(setRes.data.supabase);
        }
        if (sqlRes.success && sqlRes.data) {
          setSupabaseSql(sqlRes.data);
        }
      } catch (err) {
        // quiet
      }
    };
    loadSettings();
  }, []);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompany(true);
    setCompanySaveSuccess(false);
    try {
      const res = await api.updateCompanyProfile(companyProfile);
      if (res.success) {
        setCompanySaveSuccess(true);
        setTimeout(() => setCompanySaveSuccess(false), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update company settings');
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleTestSupabase = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.testSupabase();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(false);

    if (newPassword.length < 8) {
      setPwdError('New password must contain at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('New password and confirmation do not match.');
      return;
    }

    try {
      await changePassword({ currentPassword, newPassword, confirmPassword });
      setPwdSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwdSuccess(false), 3000);
    } catch (err: any) {
      setPwdError(err.message || 'Failed to update password');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('SQL migration copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Platform Settings</h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
          Organization profile, PostgreSQL database configuration, and credential security.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('company')}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'company'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building className="w-4 h-4" /> Company Profile
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'database'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Database className="w-4 h-4" /> Supabase Database &amp; SQL
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'security'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Shield className="w-4 h-4" /> Account Security
        </button>
      </div>

      {/* Tab 1: Company Profile */}
      {activeTab === 'company' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs max-w-3xl">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Company Details</h3>
          <p className="text-xs text-gray-500 mb-5">
            Configure legal naming, operating hours, and localized currency.
          </p>

          {companySaveSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Company settings saved successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveCompany} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Operating Brand Name</label>
                <input
                  type="text"
                  value={companyProfile.name || ''}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, name: e.target.value })}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg disabled:opacity-75"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Official Legal Entity Name</label>
                <input
                  type="text"
                  value={companyProfile.legalName || ''}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, legalName: e.target.value })}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg disabled:opacity-75"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Corporate Email</label>
                <input
                  type="email"
                  value={companyProfile.email || ''}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, email: e.target.value })}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg disabled:opacity-75"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={companyProfile.phone || ''}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, phone: e.target.value })}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg disabled:opacity-75"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Headquarters Address</label>
              <input
                type="text"
                value={companyProfile.address || ''}
                onChange={(e) => setCompanyProfile({ ...companyProfile, address: e.target.value })}
                disabled={!isAdmin}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg disabled:opacity-75"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Operating Timezone</label>
                <input
                  type="text"
                  value={companyProfile.timezone || ''}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, timezone: e.target.value })}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg disabled:opacity-75"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Work Day Start</label>
                <input
                  type="time"
                  value={companyProfile.workStart || '09:00'}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, workStart: e.target.value })}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg disabled:opacity-75"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Work Day End</label>
                <input
                  type="time"
                  value={companyProfile.workEnd || '18:00'}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, workEnd: e.target.value })}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg disabled:opacity-75"
                />
              </div>
            </div>

            {isAdmin && (
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingCompany}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSavingCompany ? 'Saving...' : 'Save Company Settings'}
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Tab 2: Supabase Database & Migrations */}
      {activeTab === 'database' && (
        <div className="space-y-6 max-w-4xl">
          {/* Status Box */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">PostgreSQL Engine Integration</h3>
                  <p className="text-xs text-gray-500">
                    Dual-engine relational architecture (Supabase PostgreSQL + High-Performance Embedded Store).
                  </p>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  supabaseStatus?.isConfigured
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {supabaseStatus?.mode || 'Active Persistence Engine'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Supabase URL</span>
                <span className="font-mono text-gray-700">{supabaseStatus?.supabaseUrl || 'Not configured'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Service Role Key</span>
                <span className="font-semibold text-gray-700">
                  {supabaseStatus?.hasServiceRoleKey ? 'Configured in Environment' : 'Omitted (Using Local Engine)'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Database Persistence</span>
                <span className="font-semibold text-emerald-600">Active (data/opsnexus.db.json)</span>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  testResult.connected
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border border-amber-200 text-amber-800'
                }`}
              >
                {testResult.connected ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleTestSupabase}
                disabled={isTesting}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isTesting ? 'Testing...' : 'Test Supabase Connection'}
              </button>
            </div>
          </div>

          {/* Migration Inspector */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Database Migration Files</h3>
                <p className="text-xs text-gray-500">
                  Review and copy the SQL statements for instant deployment to any Supabase project.
                </p>
              </div>

              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => setActiveSqlTab('schema')}
                  className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
                    activeSqlTab === 'schema' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  schema.sql
                </button>
                <button
                  onClick={() => setActiveSqlTab('policies')}
                  className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
                    activeSqlTab === 'policies' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  policies.sql (RLS)
                </button>
                <button
                  onClick={() => setActiveSqlTab('functions')}
                  className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
                    activeSqlTab === 'functions' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  functions.sql
                </button>
              </div>
            </div>

            <div className="relative">
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono max-h-96 overflow-y-auto leading-relaxed border border-slate-800">
                {activeSqlTab === 'schema'
                  ? supabaseSql.schemaSql
                  : activeSqlTab === 'policies'
                  ? supabaseSql.policiesSql
                  : supabaseSql.functionsSql}
              </pre>

              <button
                onClick={() =>
                  copyToClipboard(
                    activeSqlTab === 'schema'
                      ? supabaseSql.schemaSql || ''
                      : activeSqlTab === 'policies'
                      ? supabaseSql.policiesSql || ''
                      : supabaseSql.functionsSql || ''
                  )
                }
                className="absolute top-3 right-3 p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Copy className="w-3.5 h-3.5" /> Copy SQL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Security & Credentials */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs max-w-xl">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Update Account Password</h3>
          <p className="text-xs text-gray-500 mb-5">
            Maintain strong security hygiene with regular password rotations.
          </p>

          {pwdError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{pwdError}</span>
            </div>
          )}

          {pwdSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Password updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Current Password *</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">New Password *</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Confirm New Password *</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs cursor-pointer"
              >
                Change Password
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
