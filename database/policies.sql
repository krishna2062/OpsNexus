-- ==============================================================================
-- OPSNEXUS ENTERPRISE - ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is Admin / Super Admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Admin / HR Manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. USERS POLICIES
CREATE POLICY "Admins can manage all users" ON users
  FOR ALL USING (auth.is_admin());

CREATE POLICY "Users can view their own user record" ON users
  FOR SELECT USING (auth.uid() = id);

-- 2. EMPLOYEE PROFILES POLICIES
CREATE POLICY "Admins can view and edit all employee profiles" ON employee_profiles
  FOR ALL USING (auth.is_admin());

CREATE POLICY "Employees can view own profile" ON employee_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Colleagues can view public profile details" ON employee_profiles
  FOR SELECT USING (true);

-- 3. ATTENDANCE POLICIES
CREATE POLICY "Admins can manage all attendance" ON attendance
  FOR ALL USING (auth.is_admin());

CREATE POLICY "Employees can view and create own attendance" ON attendance
  FOR ALL USING (auth.uid() = user_id);

-- 4. LEAVE POLICIES
CREATE POLICY "Admins can manage all leave requests" ON leave_requests
  FOR ALL USING (auth.is_admin());

CREATE POLICY "Employees can manage own leave requests" ON leave_requests
  FOR ALL USING (auth.uid() = user_id);

-- 5. PROJECTS POLICIES
CREATE POLICY "Admins can manage all projects" ON projects
  FOR ALL USING (auth.is_admin());

CREATE POLICY "Assigned members can view projects" ON projects
  FOR SELECT USING (
    auth.is_admin() OR
    EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = id AND pm.user_id = auth.uid()) OR
    project_manager_id = auth.uid()
  );

-- 6. TASKS POLICIES
CREATE POLICY "Admins and PMs can manage tasks" ON tasks
  FOR ALL USING (auth.is_admin() OR assigned_by = auth.uid());

CREATE POLICY "Assigned employees can view and update their tasks" ON tasks
  FOR ALL USING (assigned_to = auth.uid() OR assigned_by = auth.uid() OR auth.is_admin());

-- 7. PAYROLL POLICIES (STRICT PROTECTION: NO CROSS-EMPLOYEE ACCESS)
CREATE POLICY "Admins can manage all payroll" ON payroll
  FOR ALL USING (auth.is_admin());

CREATE POLICY "Employees can only view their own payroll" ON payroll
  FOR SELECT USING (auth.uid() = user_id);

-- 8. OVERTIME POLICIES
CREATE POLICY "Admins can manage all overtime" ON overtime_records
  FOR ALL USING (auth.is_admin());

CREATE POLICY "Employees can view and submit own overtime" ON overtime_records
  FOR ALL USING (auth.uid() = user_id);

-- 9. MESSAGING POLICIES
CREATE POLICY "Users can only read messages from their conversations" ON messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = auth.uid())
  );

CREATE POLICY "Users can insert messages into their conversations" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = auth.uid())
  );

-- 10. INTERNAL EMAIL POLICIES
CREATE POLICY "Users can view emails they sent or received" ON internal_emails
  FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can create emails" ON internal_emails
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- 11. NOTIFICATIONS POLICIES
CREATE POLICY "Users can manage own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- 12. AUDIT LOGS POLICIES
CREATE POLICY "Only Admins can view audit logs" ON audit_logs
  FOR SELECT USING (auth.is_admin());
