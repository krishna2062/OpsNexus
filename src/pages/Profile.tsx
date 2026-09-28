import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  Briefcase,
  FolderKanban,
  Edit2,
  Save,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [skills, setSkills] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await api.getEmployeeById(user.id);
      if (res.success) {
        setProfileData(res.data);
        setPhone(res.data.profile?.phone || '');
        setAddress(res.data.profile?.address || '');
        setSkills(res.data.profile?.skills?.join(', ') || '');
        setBio(res.data.profile?.bio || '');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user?.id) return;
    try {
      const res = await api.updateEmployee(user.id, {
        phone,
        address,
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        bio,
      });
      if (res.success) {
        setIsEditing(false);
        fetchProfile();
        refreshUser();
      }
    } catch (err) {
      alert('Failed to save profile');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-gray-500">
        Loading employee profile from database...
      </div>
    );
  }

  const p = profileData?.profile || {};
  const stats = profileData?.stats || {};

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
            {p.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{p.full_name || user?.username}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {p.employee_id} • {p.position || 'Staff Member'}
            </p>
            <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
              {profileData?.role_name}
            </span>
          </div>
        </div>

        <button
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
        >
          {isEditing ? (
            <>
              <Save className="w-4 h-4" /> Save Profile
            </>
          ) : (
            <>
              <Edit2 className="w-4 h-4" /> Edit Profile
            </>
          )}
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs text-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completed Tasks</span>
          <div className="text-2xl font-bold text-blue-600 mt-1">{stats.completedTasks || 0}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs text-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Task Completion Rate</span>
          <div className="text-2xl font-bold text-purple-600 mt-1">{stats.taskCompletionRate || 0}%</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs text-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Days Present</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.daysPresent || 0}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs text-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hours Worked</span>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.totalHoursWorked || 0} hrs</div>
        </div>
      </div>

      {/* Details Sections */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-5 text-xs">
        <h3 className="text-sm font-bold text-gray-900">Personal &amp; Contact Details</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-500 font-medium mb-1">Email Address</label>
            <input
              type="text"
              disabled
              value={user?.email || ''}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-medium mb-1">Phone Number</label>
            <input
              type="tel"
              disabled={!isEditing}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg disabled:bg-gray-50/50"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-medium mb-1">Physical Address</label>
            <input
              type="text"
              disabled={!isEditing}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="City, State, Country"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg disabled:bg-gray-50/50"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-medium mb-1">Department</label>
            <input
              type="text"
              disabled
              value={profileData?.department?.name || 'Unassigned'}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-500 font-medium mb-1">Skills &amp; Technologies</label>
          <input
            type="text"
            disabled={!isEditing}
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="React, TypeScript, SQL, Project Management..."
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg disabled:bg-gray-50/50"
          />
        </div>

        <div>
          <label className="block text-gray-500 font-medium mb-1">Professional Bio</label>
          <textarea
            rows={3}
            disabled={!isEditing}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Share your focus area, experience, or mission..."
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg disabled:bg-gray-50/50"
          />
        </div>
      </div>
    </div>
  );
};
