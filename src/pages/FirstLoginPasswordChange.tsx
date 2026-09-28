import React, { useState } from 'react';
import { ShieldAlert, Lock, CheckCircle, AlertCircle, ArrowRight, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const FirstLoginPasswordChange: React.FC = () => {
  const { firstLoginPasswordChange, logout, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setError('Please provide your current temporary password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword === 'admin') {
      setError('Security policy: You cannot reuse the default initial password.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from current password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await firstLoginPasswordChange({ currentPassword, newPassword, confirmPassword });
    } catch (err: any) {
      setError(err.message || 'Failed to update initial password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4 font-sans text-gray-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500 text-white font-bold text-2xl shadow-lg mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Security Requirement</h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">First-Time Login Password Update</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          <div className="mb-6 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            <p className="font-semibold text-amber-950">Action Mandatory</p>
            <p className="mt-0.5 text-amber-800">
              Welcome, <span className="font-semibold">{user?.username}</span>. To protect your organization&apos;s data, you must change your temporary/default password before proceeding to your dashboard.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Current Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>

            <ul className="text-[11px] text-gray-500 space-y-1 py-1">
              <li className="flex items-center gap-1.5">
                <CheckCircle className={`w-3.5 h-3.5 ${newPassword.length >= 8 ? 'text-emerald-500' : 'text-gray-300'}`} />
                <span>At least 8 characters</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle
                  className={`w-3.5 h-3.5 ${newPassword && newPassword === confirmPassword ? 'text-emerald-500' : 'text-gray-300'}`}
                />
                <span>Passwords match</span>
              </li>
            </ul>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <span>Updating Password...</span>
              ) : (
                <>
                  <span>Save Password &amp; Enter OpsNexus</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => logout()}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-lg transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out &amp; Return to Login</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
