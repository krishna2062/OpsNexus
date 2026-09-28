import { Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/db';
import { AuthRequest, logAudit } from '../middleware/auth';
import { Project, ProjectMember, Conversation } from '../db/schema';

export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const isUserAdmin = req.user?.role_name === 'Super Admin' || req.user?.role_name === 'Admin / HR Manager';
    const userId = req.user?.id;
    const { status, priority, search } = req.query;

    let projects = [...db.projects];

    // If not admin, filter projects where user is manager or member
    if (!isUserAdmin && userId) {
      projects = projects.filter((p) => {
        const isMgr = p.project_manager_id === userId;
        const isMember = db.project_members.some((pm) => pm.project_id === p.id && pm.user_id === userId);
        return isMgr || isMember;
      });
    }

    if (status) {
      projects = projects.filter((p) => p.status === status);
    }
    if (priority) {
      projects = projects.filter((p) => p.priority === priority);
    }

    // Map details
    let results = projects.map((p) => {
      const pmUser = p.project_manager_id ? db.users.find((u) => u.id === p.project_manager_id) : null;
      const pmProfile = p.project_manager_id ? db.employee_profiles.find((prof) => prof.user_id === p.project_manager_id) : null;
      const members = db.project_members.filter((pm) => pm.project_id === p.id);
      const projectTasks = db.tasks.filter((t) => t.project_id === p.id);
      const completedTasks = projectTasks.filter((t) => t.status === 'Completed').length;

      return {
        ...p,
        project_manager_name: pmProfile?.full_name || pmUser?.username || 'Unassigned',
        team_members_count: members.length,
        total_tasks_count: projectTasks.length,
        completed_tasks_count: completedTasks,
      };
    });

    if (search) {
      const q = String(search).toLowerCase();
      results = results.filter((p) => p.name.toLowerCase().includes(q) || p.project_code.toLowerCase().includes(q) || (p.client && p.client.toLowerCase().includes(q)));
    }

    results.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));

    return res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve projects.' });
  }
};

export const getProjectById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isUserAdmin = req.user?.role_name === 'Super Admin' || req.user?.role_name === 'Admin / HR Manager';
    const userId = req.user?.id;

    const project = db.projects.find((p) => p.id === id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const members = db.project_members.filter((pm) => pm.project_id === id);
    const isMember = members.some((m) => m.user_id === userId);
    const isMgr = project.project_manager_id === userId;

    if (!isUserAdmin && !isMember && !isMgr) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view this project.' });
    }

    const pmUser = project.project_manager_id ? db.users.find((u) => u.id === project.project_manager_id) : null;
    const pmProfile = project.project_manager_id ? db.employee_profiles.find((prof) => prof.user_id === project.project_manager_id) : null;

    const memberDetails = members.map((m) => {
      const u = db.users.find((user) => user.id === m.user_id);
      const prof = db.employee_profiles.find((p) => p.user_id === m.user_id);
      return {
        ...m,
        user_name: prof?.full_name || u?.username || 'Team Member',
        user_email: u?.email || '',
        position: prof?.position || '',
        profile_picture_url: prof?.profile_picture_url || '',
      };
    });

    const tasks = db.tasks.filter((t) => t.project_id === id);
    const completedCount = tasks.filter((t) => t.status === 'Completed').length;

    return res.json({
      success: true,
      data: {
        ...project,
        project_manager_name: pmProfile?.full_name || pmUser?.username || 'Unassigned',
        members: memberDetails,
        tasks,
        total_tasks: tasks.length,
        completed_tasks: completedCount,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve project details.' });
  }
};

export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const { name, project_code, description, client, start_date, deadline, priority, budget, project_manager_id, status, member_ids } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Project name is required.' });
    }

    let code = project_code ? String(project_code).trim().toUpperCase() : '';
    if (!code) {
      const count = db.projects.length + 1;
      code = `PRJ-${String(count).padStart(3, '0')}`;
    } else {
      if (db.projects.some((p) => p.project_code.toUpperCase() === code)) {
        return res.status(400).json({ success: false, message: `Project code '${code}' already exists.` });
      }
    }

    const now = new Date().toISOString();
    const newProjectId = crypto.randomUUID();

    const newProject: Project = {
      id: newProjectId,
      project_code: code,
      name: String(name).trim(),
      description: description || '',
      client: client || '',
      start_date: start_date || now.split('T')[0],
      deadline: deadline || undefined,
      priority: priority || 'Medium',
      budget: Number(budget) || 0,
      project_manager_id: project_manager_id || req.user?.id || null,
      status: status || 'Planning',
      progress_percentage: 0,
      created_by: req.user?.id || null,
      created_at: now,
      updated_at: now,
    };

    db.projects.push(newProject);

    // Add PM as member if specified
    if (newProject.project_manager_id) {
      db.project_members.push({
        id: crypto.randomUUID(),
        project_id: newProjectId,
        user_id: newProject.project_manager_id,
        role_in_project: 'Project Manager',
        assigned_at: now,
      });
    }

    // Add assigned team members
    if (Array.isArray(member_ids)) {
      member_ids.forEach((m: any) => {
        const uId = typeof m === 'string' ? m : m.user_id;
        const roleInProj = typeof m === 'object' && m.role_in_project ? m.role_in_project : 'Team Member';
        if (uId && !db.project_members.some((pm) => pm.project_id === newProjectId && pm.user_id === uId)) {
          db.project_members.push({
            id: crypto.randomUUID(),
            project_id: newProjectId,
            user_id: uId,
            role_in_project: roleInProj,
            assigned_at: now,
          });

          // Send notification
          db.notifications.push({
            id: crypto.randomUUID(),
            user_id: uId,
            type: 'PROJECT_ASSIGNED',
            title: 'Assigned to New Project',
            description: `You have been added to project "${newProject.name}" as ${roleInProj}.`,
            entity_type: 'PROJECT',
            entity_id: newProjectId,
            is_read: false,
            created_at: now,
          });
        }
      });
    }

    // Create a dedicated project chat channel!
    const projConversation: Conversation = {
      id: crypto.randomUUID(),
      type: 'project',
      title: `Project: ${newProject.name}`,
      project_id: newProjectId,
      created_by: req.user?.id || null,
      created_at: now,
      updated_at: now,
    };
    db.conversations.push(projConversation);

    // Add all project members to this conversation
    const allMembers = db.project_members.filter((pm) => pm.project_id === newProjectId);
    allMembers.forEach((mem) => {
      db.conversation_members.push({
        id: crypto.randomUUID(),
        conversation_id: projConversation.id,
        user_id: mem.user_id,
        joined_at: now,
        last_read_at: now,
      });
    });

    db.save();

    logAudit(req, 'PROJECT_CREATED', 'PROJECT', newProjectId, { code, name: newProject.name });

    return res.status(201).json({
      success: true,
      message: `Project '${newProject.name}' created successfully.`,
      data: newProject,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to create project.' });
  }
};

export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const project = db.projects.find((p) => p.id === id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const { name, description, client, start_date, deadline, priority, budget, project_manager_id, status } = req.body;

    if (name) project.name = String(name).trim();
    if (description !== undefined) project.description = description;
    if (client !== undefined) project.client = client;
    if (start_date !== undefined) project.start_date = start_date;
    if (deadline !== undefined) project.deadline = deadline;
    if (priority) project.priority = priority;
    if (budget !== undefined) project.budget = Number(budget) || 0;
    if (project_manager_id !== undefined) project.project_manager_id = project_manager_id || null;
    if (status) project.status = status;

    project.updated_at = new Date().toISOString();
    db.save();

    logAudit(req, 'PROJECT_UPDATED', 'PROJECT', id, { name: project.name, status: project.status });

    return res.json({
      success: true,
      message: 'Project updated successfully.',
      data: project,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update project.' });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const index = db.projects.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const name = db.projects[index].name;

    // Delete members, tasks, and task comments
    const projectTasks = db.tasks.filter((t) => t.project_id === id);
    const taskIds = projectTasks.map((t) => t.id);

    db.task_comments = db.task_comments.filter((tc) => !taskIds.includes(tc.task_id));
    db.tasks = db.tasks.filter((t) => t.project_id !== id);
    db.project_members = db.project_members.filter((pm) => pm.project_id !== id);
    db.conversations = db.conversations.filter((c) => c.project_id !== id);

    db.projects.splice(index, 1);
    db.save();

    logAudit(req, 'PROJECT_DELETED', 'PROJECT', id, { name });

    return res.json({
      success: true,
      message: `Project '${name}' and associated tasks were deleted.`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete project.' });
  }
};

export const addProjectMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id, role_in_project } = req.body;

    const project = db.projects.find((p) => p.id === id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (!user_id) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const existing = db.project_members.find((pm) => pm.project_id === id && pm.user_id === user_id);
    if (existing) {
      existing.role_in_project = role_in_project || existing.role_in_project;
      db.save();
      return res.json({ success: true, message: 'Member role updated in project.', data: existing });
    }

    const now = new Date().toISOString();
    const newMember: ProjectMember = {
      id: crypto.randomUUID(),
      project_id: id,
      user_id,
      role_in_project: role_in_project || 'Team Member',
      assigned_at: now,
    };

    db.project_members.push(newMember);

    // Add to project conversation
    const projConv = db.conversations.find((c) => c.project_id === id);
    if (projConv && !db.conversation_members.some((cm) => cm.conversation_id === projConv.id && cm.user_id === user_id)) {
      db.conversation_members.push({
        id: crypto.randomUUID(),
        conversation_id: projConv.id,
        user_id,
        joined_at: now,
        last_read_at: now,
      });
    }

    // Send notification
    db.notifications.push({
      id: crypto.randomUUID(),
      user_id,
      type: 'PROJECT_ASSIGNED',
      title: 'Assigned to Project',
      description: `You have been added to project "${project.name}" as ${newMember.role_in_project}.`,
      entity_type: 'PROJECT',
      entity_id: id,
      is_read: false,
      created_at: now,
    });

    db.save();

    logAudit(req, 'PROJECT_MEMBER_ADDED', 'PROJECT', id, { user_id, role: newMember.role_in_project });

    return res.status(201).json({
      success: true,
      message: 'Team member added to project.',
      data: newMember,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to add project member.' });
  }
};

export const removeProjectMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId } = req.params;
    const index = db.project_members.findIndex((pm) => pm.project_id === id && pm.user_id === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Member not found in project.' });
    }

    db.project_members.splice(index, 1);
    db.save();

    logAudit(req, 'PROJECT_MEMBER_REMOVED', 'PROJECT', id, { user_id: userId });

    return res.json({ success: true, message: 'Team member removed from project.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to remove project member.' });
  }
};
