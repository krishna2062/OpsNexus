import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const s = status ? status.toLowerCase() : '';

  let colorClasses = 'bg-gray-50 text-gray-700 border-gray-200';

  if (['active', 'approved', 'completed', 'paid', 'present'].includes(s)) {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (['in progress', 'review', 'submitted for review', 'processed'].includes(s)) {
    colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (['pending', 'planning', 'on hold', 'late', 'half day'].includes(s)) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (['rejected', 'cancelled', 'terminated', 'suspended', 'absent', 'blocked', 'urgent'].includes(s)) {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (['leave', 'holiday', 'revision required'].includes(s)) {
    colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs sm:text-xs font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border font-medium ${sizeClasses} ${colorClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
};
