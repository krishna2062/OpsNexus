import { Response } from 'express';
import { db } from '../db/db';
import { AuthRequest } from '../middleware/auth';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { action, entity_type, user_id, start_date, end_date, search } = req.query;

    let logs = [...db.audit_logs];

    if (action) {
      logs = logs.filter((l) => l.action === action);
    }
    if (entity_type) {
      logs = logs.filter((l) => l.entity_type === entity_type);
    }
    if (user_id) {
      logs = logs.filter((l) => l.user_id === user_id);
    }
    if (start_date) {
      logs = logs.filter((l) => l.created_at >= String(start_date));
    }
    if (end_date) {
      logs = logs.filter((l) => l.created_at <= String(end_date));
    }

    if (search) {
      const q = String(search).toLowerCase();
      logs = logs.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.entity_type.toLowerCase().includes(q) ||
          (l.user_email && l.user_email.toLowerCase().includes(q)) ||
          (l.user_role && l.user_role.toLowerCase().includes(q))
      );
    }

    logs.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));

    return res.json({
      success: true,
      count: logs.length,
      data: logs.slice(0, 200), // top 200 most recent
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve audit logs.' });
  }
};
