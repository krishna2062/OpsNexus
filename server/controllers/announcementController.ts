import { Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/db';
import { AuthRequest, logAudit } from '../middleware/auth';
import { Announcement } from '../db/schema';

export const getAnnouncements = async (req: AuthRequest, res: Response) => {
  try {
    const isUserAdmin = req.user?.role_name === 'Super Admin' || req.user?.role_name === 'Admin / HR Manager';
    const profile = db.employee_profiles.find((p) => p.user_id === req.user?.id);
    const userDeptId = profile?.department_id;

    let announcements = db.announcements.filter((a) => {
      // Expiry filter
      if (a.expiry_date && new Date(a.expiry_date) < new Date()) {
        return false;
      }
      if (isUserAdmin) return true;
      if (a.audience === 'Everyone') return true;
      if (a.audience === 'Department' && a.department_id === userDeptId) return true;
      return false;
    });

    const results = announcements.map((a) => {
      const author = a.created_by ? db.users.find((u) => u.id === a.created_by) : null;
      const dept = a.department_id ? db.departments.find((d) => d.id === a.department_id) : null;

      return {
        ...a,
        created_by_name: author?.username || 'Management',
        department_name: dept?.name || '',
      };
    });

    results.sort((a, b) => (b.publish_date > a.publish_date ? 1 : -1));

    return res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve announcements.' });
  }
};

export const createAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, priority, audience, department_id, expiry_date, attachment_url } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Announcement title and content are required.' });
    }

    const now = new Date().toISOString();
    const newAnnouncement: Announcement = {
      id: crypto.randomUUID(),
      title: String(title).trim(),
      content: String(content).trim(),
      priority: priority || 'Medium',
      publish_date: now,
      expiry_date: expiry_date || null,
      audience: audience || 'Everyone',
      department_id: department_id || null,
      attachment_url: attachment_url || undefined,
      created_by: req.user?.id || null,
      created_at: now,
    };

    db.announcements.push(newAnnouncement);

    // Notify target audience
    const targetUsers = db.users.filter((u) => {
      if (u.status !== 'Active') return false;
      if (newAnnouncement.audience === 'Everyone') return true;
      if (newAnnouncement.audience === 'Department') {
        const prof = db.employee_profiles.find((p) => p.user_id === u.id);
        return prof?.department_id === department_id;
      }
      return false;
    });

    targetUsers.forEach((u) => {
      db.notifications.push({
        id: crypto.randomUUID(),
        user_id: u.id,
        type: 'NEW_ANNOUNCEMENT',
        title: `Announcement: ${newAnnouncement.title}`,
        description: newAnnouncement.content.slice(0, 100) + '...',
        entity_type: 'ANNOUNCEMENT',
        entity_id: newAnnouncement.id,
        is_read: false,
        created_at: now,
      });
    });

    db.save();

    logAudit(req, 'ANNOUNCEMENT_CREATED', 'ANNOUNCEMENT', newAnnouncement.id, { title: newAnnouncement.title });

    return res.status(201).json({
      success: true,
      message: 'Announcement published successfully.',
      data: newAnnouncement,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to create announcement.' });
  }
};

export const deleteAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const index = db.announcements.findIndex((a) => a.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Announcement not found.' });
    }

    const title = db.announcements[index].title;
    db.announcements.splice(index, 1);
    db.save();

    logAudit(req, 'ANNOUNCEMENT_DELETED', 'ANNOUNCEMENT', id, { title });

    return res.json({ success: true, message: `Announcement '${title}' deleted.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete announcement.' });
  }
};
