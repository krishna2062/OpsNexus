import { Response } from 'express';
import { db } from '../db/db';
import { AuthRequest } from '../middleware/auth';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const notifications = db.notifications.filter((n) => n.user_id === userId);
    notifications.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return res.json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve notifications.' });
  }
};

export const markNotificationRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const notif = db.notifications.find((n) => n.id === id && n.user_id === userId);
    if (!notif) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    notif.is_read = true;
    db.save();

    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    db.notifications.forEach((n) => {
      if (n.user_id === userId) {
        n.is_read = true;
      }
    });

    db.save();

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to mark all as read.' });
  }
};
