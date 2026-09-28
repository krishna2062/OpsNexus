import { Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/db';
import { AuthRequest, logAudit } from '../middleware/auth';
import { Task, TaskComment } from '../db/schema';

export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const isUserAdmin = req.user?.role_name === 'Super Admin' || req.user?.role_name === 'Admin / HR Manager';
    const userId = req.user?.id;
    const { project_id, status, priority, assigned_to, search } = req.query;

    let tasks = [...db.tasks];

    // Gating: If not admin/PM, and not filtering explicitly by assigned_to
    if (!isUserAdmin && req.user?.role_name === 'Staff / Employee') {
      tasks = tasks.filter((t) => t.assigned_to === userId || t.assigned_by === userId);
    }

    if (project_id) {
      tasks = tasks.filter((t) => t.project_id === project_id);
    }
    if (status) {
      tasks = tasks.filter((t) => t.status === status);
    }
    if (priority) {
      tasks = tasks.filter((t) => t.priority === priority);
    }
    if (assigned_to) {
      tasks = tasks.filter((t) => t.assigned_to === assigned_to);
    }

    // Join project, assignee, and creator names
    let results = tasks.map((t) => {
      const proj = db.projects.find((p) => p.id === t.project_id);
      const assigneeUser = t.assigned_to ? db.users.find((u) => u.id === t.assigned_to) : null;
      const assigneeProf = t.assigned_to ? db.employee_profiles.find((p) => p.user_id === t.assigned_to) : null;
      const creatorUser = t.assigned_by ? db.users.find((u) => u.id === t.assigned_by) : null;
      const creatorProf = t.assigned_by ? db.employee_profiles.find((p) => p.user_id === t.assigned_by) : null;

      return {
        ...t,
        project_name: proj?.name || 'Unknown Project',
        project_code: proj?.project_code || '',
        assigned_to_name: assigneeProf?.full_name || assigneeUser?.username || 'Unassigned',
        assigned_to_email: assigneeUser?.email || '',
        assigned_by_name: creatorProf?.full_name || creatorUser?.username || 'System',
      };
    });

    if (search) {
      const q = String(search).toLowerCase();
      results = results.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.task_code.toLowerCase().includes(q) ||
          t.project_name.toLowerCase().includes(q) ||
          t.assigned_to_name.toLowerCase().includes(q)
      );
    }

    results.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));

    return res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve tasks.' });
  }
};

export const getTaskById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const task = db.tasks.find((t) => t.id === id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const proj = db.projects.find((p) => p.id === task.project_id);
    const assigneeProf = task.assigned_to ? db.employee_profiles.find((p) => p.user_id === task.assigned_to) : null;
    const assigneeUser = task.assigned_to ? db.users.find((u) => u.id === task.assigned_to) : null;
    const creatorProf = task.assigned_by ? db.employee_profiles.find((p) => p.user_id === task.assigned_by) : null;
    const comments = db.task_comments.filter((tc) => tc.task_id === id);

    return res.json({
      success: true,
      data: {
        ...task,
        project_name: proj?.name || 'Unknown Project',
        project_code: proj?.project_code || '',
        assigned_to_name: assigneeProf?.full_name || assigneeUser?.username || 'Unassigned',
        assigned_by_name: creatorProf?.full_name || 'System',
        comments,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve task.' });
  }
};

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const { project_id, title, description, assigned_to, priority, deadline, estimated_hours } = req.body;

    if (!project_id || !title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Project and task title are required.' });
    }

    const project = db.projects.find((p) => p.id === project_id);
    if (!project) {
      return res.status(400).json({ success: false, message: 'Project not found.' });
    }

    const now = new Date().toISOString();
    const taskCount = db.tasks.length + 1;
    const taskCode = `TSK-${String(taskCount).padStart(4, '0')}`;
    const newTaskId = crypto.randomUUID();

    const newTask: Task = {
      id: newTaskId,
      task_code: taskCode,
      project_id,
      title: String(title).trim(),
      description: description || '',
      assigned_to: assigned_to || null,
      assigned_by: req.user?.id || null,
      priority: priority || 'Medium',
      deadline: deadline || undefined,
      estimated_hours: Number(estimated_hours) || 0,
      actual_hours: 0,
      progress_percentage: 0,
      status: 'Pending',
      created_at: now,
      updated_at: now,
    };

    db.tasks.push(newTask);

    // If assigned to a user, notify them
    if (assigned_to) {
      db.notifications.push({
        id: crypto.randomUUID(),
        user_id: assigned_to,
        type: 'TASK_ASSIGNED',
        title: 'New Task Assigned',
        description: `You have been assigned task "${newTask.title}" in project "${project.name}".`,
        entity_type: 'TASK',
        entity_id: newTaskId,
        is_read: false,
        created_at: now,
      });
    }

    db.save();
    db.recalculateProjectProgress(project_id);

    logAudit(req, 'TASK_CREATED', 'TASK', newTaskId, { code: taskCode, title: newTask.title, project_id });

    return res.status(201).json({
      success: true,
      message: `Task '${newTask.title}' (${taskCode}) created successfully.`,
      data: newTask,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to create task.' });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const task = db.tasks.find((t) => t.id === id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const { title, description, assigned_to, priority, deadline, estimated_hours, actual_hours, progress_percentage } = req.body;

    if (title) task.title = String(title).trim();
    if (description !== undefined) task.description = description;
    if (assigned_to !== undefined) task.assigned_to = assigned_to || null;
    if (priority) task.priority = priority;
    if (deadline !== undefined) task.deadline = deadline;
    if (estimated_hours !== undefined) task.estimated_hours = Number(estimated_hours) || 0;
    if (actual_hours !== undefined) task.actual_hours = Number(actual_hours) || 0;
    if (progress_percentage !== undefined) {
      task.progress_percentage = Math.min(100, Math.max(0, Number(progress_percentage)));
    }

    task.updated_at = new Date().toISOString();
    db.save();
    db.recalculateProjectProgress(task.project_id);

    logAudit(req, 'TASK_UPDATED', 'TASK', id, { title: task.title });

    return res.json({
      success: true,
      message: 'Task updated successfully.',
      data: task,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update task.' });
  }
};

export const updateTaskStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, progress_percentage, actual_hours, submission_notes, submission_attachment_url, review_feedback } = req.body;

    const validStatuses = ['Pending', 'Accepted', 'In Progress', 'Blocked', 'Submitted for Review', 'Revision Required', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid task status '${status}'.` });
    }

    const task = db.tasks.find((t) => t.id === id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const now = new Date().toISOString();
    task.status = status;

    if (progress_percentage !== undefined) {
      task.progress_percentage = Math.min(100, Math.max(0, Number(progress_percentage)));
    }
    if (actual_hours !== undefined) {
      task.actual_hours = Number(actual_hours) || task.actual_hours;
    }

    if (status === 'In Progress' && task.progress_percentage === 0) {
      task.progress_percentage = 20;
    }

    if (status === 'Submitted for Review') {
      task.submission_notes = submission_notes || '';
      task.submission_attachment_url = submission_attachment_url || '';
      task.submitted_at = now;
      task.progress_percentage = 95;

      // Notify assigner or project manager
      const notifyTarget = task.assigned_by || (db.projects.find((p) => p.id === task.project_id)?.project_manager_id);
      if (notifyTarget && notifyTarget !== req.user?.id) {
        db.notifications.push({
          id: crypto.randomUUID(),
          user_id: notifyTarget,
          type: 'TASK_SUBMITTED',
          title: 'Task Submitted for Review',
          description: `Task "${task.title}" has been submitted for review by ${req.user?.username}.`,
          entity_type: 'TASK',
          entity_id: id,
          is_read: false,
          created_at: now,
        });
      }
    }

    if (status === 'Completed') {
      task.progress_percentage = 100;
      task.reviewed_by = req.user?.id || null;
      task.reviewed_at = now;
      if (review_feedback) task.review_feedback = review_feedback;

      // Notify assignee of completion approval
      if (task.assigned_to && task.assigned_to !== req.user?.id) {
        db.notifications.push({
          id: crypto.randomUUID(),
          user_id: task.assigned_to,
          type: 'TASK_APPROVED',
          title: 'Task Approved & Completed',
          description: `Your work on task "${task.title}" was approved by ${req.user?.username}.`,
          entity_type: 'TASK',
          entity_id: id,
          is_read: false,
          created_at: now,
        });
      }
    }

    if (status === 'Revision Required') {
      task.reviewed_by = req.user?.id || null;
      task.review_feedback = review_feedback || 'Please revise your submission based on requirements.';
      task.reviewed_at = now;
      task.progress_percentage = 60;

      // Notify assignee
      if (task.assigned_to) {
        db.notifications.push({
          id: crypto.randomUUID(),
          user_id: task.assigned_to,
          type: 'TASK_REVISION',
          title: 'Task Revision Requested',
          description: `Revision requested for "${task.title}": ${task.review_feedback}`,
          entity_type: 'TASK',
          entity_id: id,
          is_read: false,
          created_at: now,
        });
      }
    }

    task.updated_at = now;
    db.save();
    db.recalculateProjectProgress(task.project_id);

    logAudit(req, 'TASK_STATUS_CHANGED', 'TASK', id, { newStatus: status, progress: task.progress_percentage });

    return res.json({
      success: true,
      message: `Task status updated to ${status}.`,
      data: task,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update task status.' });
  }
};

export const addTaskComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comment, attachment_url } = req.body;
    const userId = req.user?.id;

    if (!userId || !comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required.' });
    }

    const task = db.tasks.find((t) => t.id === id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const profile = db.employee_profiles.find((p) => p.user_id === userId);
    const now = new Date().toISOString();

    const newComment: TaskComment = {
      id: crypto.randomUUID(),
      task_id: id,
      user_id: userId,
      user_name: profile?.full_name || req.user?.username || 'Team Member',
      comment: String(comment).trim(),
      attachment_url: attachment_url || undefined,
      created_at: now,
    };

    db.task_comments.push(newComment);
    db.save();

    return res.status(201).json({
      success: true,
      data: newComment,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to post comment.' });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const index = db.tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const task = db.tasks[index];
    db.task_comments = db.task_comments.filter((tc) => tc.task_id !== id);
    db.tasks.splice(index, 1);
    db.save();
    db.recalculateProjectProgress(task.project_id);

    logAudit(req, 'TASK_DELETED', 'TASK', id, { code: task.task_code, title: task.title });

    return res.json({ success: true, message: `Task '${task.title}' deleted.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete task.' });
  }
};
