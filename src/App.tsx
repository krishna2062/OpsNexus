import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { Login } from './pages/Login';
import { FirstLoginPasswordChange } from './pages/FirstLoginPasswordChange';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { Departments } from './pages/Departments';
import { AttendancePage } from './pages/Attendance';
import { Leaves } from './pages/Leaves';
import { Projects } from './pages/Projects';
import { Tasks } from './pages/Tasks';
import { StaffWorkspace } from './pages/StaffWorkspace';
import { PayrollPage } from './pages/Payroll';
import { OvertimePage } from './pages/Overtime';
import { InternalMail } from './pages/InternalMail';
import { TeamChat } from './pages/TeamChat';
import { Files } from './pages/Files';
import { Announcements } from './pages/Announcements';
import { Reports } from './pages/Reports';
import { AuditLogs } from './pages/AuditLogs';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';

const AppContent: React.FC = () => {
  const { user, loading, needsPasswordChange } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase">OpsNexus Engine Loading...</p>
      </div>
    );
  }

  // Not authenticated -> Show Login
  if (!user) {
    return <Login />;
  }

  // First Login Password Change Mandatory Gate
  if (needsPasswordChange) {
    return <FirstLoginPasswordChange />;
  }

  // Render current tab within responsive master layout
  const renderCurrentPage = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard onNavigateTab={(tab) => setCurrentTab(tab)} />;
      case 'employees':
        return <Employees />;
      case 'departments':
        return <Departments />;
      case 'attendance':
        return <AttendancePage />;
      case 'leaves':
        return <Leaves />;
      case 'projects':
        return <Projects />;
      case 'tasks':
        return <Tasks />;
      case 'workspace':
        return <StaffWorkspace onNavigateTab={(tab) => setCurrentTab(tab)} />;
      case 'payroll':
        return <PayrollPage />;
      case 'overtime':
        return <OvertimePage />;
      case 'mail':
        return <InternalMail />;
      case 'chat':
        return <TeamChat />;
      case 'files':
        return <Files />;
      case 'announcements':
        return <Announcements />;
      case 'reports':
        return <Reports />;
      case 'audit-logs':
        return <AuditLogs />;
      case 'settings':
        return <Settings />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard onNavigateTab={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <AppLayout currentTab={currentTab} onSelectTab={(tab) => setCurrentTab(tab)}>
      {renderCurrentPage()}
    </AppLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
