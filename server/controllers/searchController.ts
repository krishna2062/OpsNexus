import { Response } from 'express';
import { db } from '../db/db';
import { AuthRequest } from '../middleware/auth';

export const globalSearch = async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || String(q).trim().length < 2) {
      return res.json({
        success: true,
        data: { employees: [], projects: [], tasks: [], files: [], departments: [] },
      });
    }

    const query = String(q).trim().toLowerCase();
    const isUserAdmin = req.user?.role_name === 'Super Admin' || req.user?.role_name === 'Admin / HR Manager';
    const userId = req.user?.id;

    // Search employees
    const employees = db.users
      .filter((u) => {
        const prof = db.employee_profiles.find((p) => p.user_id === u.id);
        return (
          u.username.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          (prof?.full_name && prof.full_name.toLowerCase().includes(query)) ||
          (prof?.position && prof.position.toLowerCase().includes(query)) ||
          (prof?.employee_id && prof.employee_id.toLowerCase().includes(query))
        );
      })
      .map((u) => {
        const prof = db.employee_profiles.find((p) => p.user_id === u.id);
        return {
          id: u.id,
          title: prof?.full_name || u.username,
          subtitle: `${prof?.position || 'Staff'} • ${prof?.employee_id || ''}`,
          type: 'employee',
        };
      })
      .slice(0, 5);

    // Search projects
    let projects = [...db.projects];
    if (!isUserAdmin && userId) {
      projects = projects.filter(
        (p) => p.project_manager_id === userId || db.project_members.some((pm) => pm.project_id === p.id && pm.user_id === userId)
      );
    }
    const matchedProjects = projects
      .filter((p) => p.name.toLowerCase().includes(query) || p.project_code.toLowerCase().includes(query))
      .map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: `${p.project_code} • ${p.status} • ${p.progress_percentage}%`,
        type: 'project',
      }))
      .slice(0, 5);

    // Search tasks
    let tasks = [...db.tasks];
    if (!isUserAdmin && userId) {
      tasks = tasks.filter((t) => t.assigned_to === userId || t.assigned_by === userId);
    }
    const matchedTasks = tasks
      .filter((t) => t.title.toLowerCase().includes(query) || t.task_code.toLowerCase().includes(query))
      .map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: `${t.task_code} • ${t.status} • Priority: ${t.priority}`,
        type: 'task',
      }))
      .slice(0, 5);

    // Search files
    let files = [...db.file_vault];
    if (!isUserAdmin && userId) {
      files = files.filter((f) => f.uploaded_by === userId || f.access_level === 'Public' || f.access_level === 'Company');
    }
    const matchedFiles = files
      .filter((f) => f.original_name.toLowerCase().includes(query))
      .map((f) => ({
        id: f.id,
        title: f.original_name,
        subtitle: `${f.category} • ${(f.file_size / 1024).toFixed(1)} KB`,
        type: 'file',
      }))
      .slice(0, 5);

    // Search departments
    const matchedDepartments = db.departments
      .filter((d) => d.name.toLowerCase().includes(query))
      .map((d) => ({
        id: d.id,
        title: d.name,
        subtitle: `Department • Status: ${d.status}`,
        type: 'department',
      }))
      .slice(0, 5);

    return res.json({
      success: true,
      data: {
        employees,
        projects: matchedProjects,
        tasks: matchedTasks,
        files: matchedFiles,
        departments: matchedDepartments,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to perform search.' });
  }
};
