-- ==============================================================================
-- OPSNEXUS ENTERPRISE - DATABASE FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employee_profiles_updated_at BEFORE UPDATE ON employee_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payroll_updated_at BEFORE UPDATE ON payroll FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to recalculate project progress from tasks
CREATE OR REPLACE FUNCTION recalculate_project_progress(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_tasks INT;
  v_completed_tasks INT;
  v_avg_progress INT;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'Completed')
  INTO v_total_tasks, v_completed_tasks
  FROM tasks
  WHERE project_id = p_project_id;

  IF v_total_tasks > 0 THEN
    SELECT COALESCE(ROUND(AVG(progress_percentage)), 0)
    INTO v_avg_progress
    FROM tasks
    WHERE project_id = p_project_id;

    UPDATE projects
    SET progress_percentage = v_avg_progress
    WHERE id = p_project_id;
  ELSE
    UPDATE projects
    SET progress_percentage = 0
    WHERE id = p_project_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
