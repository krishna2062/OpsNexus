import { Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/db';
import { AuthRequest, logAudit } from '../middleware/auth';
import { InternalEmail } from '../db/schema';

export const getEmails = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { box = 'inbox', search } = req.query;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    let emails = [...db.internal_emails];

    switch (box) {
      case 'inbox':
        emails = emails.filter(
          (e) => e.recipient_id === userId && !e.is_draft && !e.is_archived_by_recipient && !e.is_deleted_by_recipient
        );
        break;
      case 'sent':
        emails = emails.filter(
          (e) => e.sender_id === userId && !e.is_draft && !e.is_archived_by_sender && !e.is_deleted_by_sender
        );
        break;
      case 'drafts':
        emails = emails.filter((e) => e.sender_id === userId && e.is_draft && !e.is_deleted_by_sender);
        break;
      case 'archived':
        emails = emails.filter(
          (e) =>
            (e.recipient_id === userId && e.is_archived_by_recipient && !e.is_deleted_by_recipient) ||
            (e.sender_id === userId && e.is_archived_by_sender && !e.is_deleted_by_sender)
        );
        break;
      case 'trash':
        emails = emails.filter(
          (e) =>
            (e.recipient_id === userId && e.is_deleted_by_recipient) ||
            (e.sender_id === userId && e.is_deleted_by_sender)
        );
        break;
      default:
        emails = emails.filter((e) => e.recipient_id === userId && !e.is_draft && !e.is_deleted_by_recipient);
    }

    // Attach sender and recipient details
    let results = emails.map((e) => {
      const sProf = db.employee_profiles.find((p) => p.user_id === e.sender_id);
      const sUser = db.users.find((u) => u.id === e.sender_id);
      const rProf = db.employee_profiles.find((p) => p.user_id === e.recipient_id);
      const rUser = db.users.find((u) => u.id === e.recipient_id);

      return {
        ...e,
        sender_name: sProf?.full_name || sUser?.username || 'Team Member',
        sender_email: sUser?.email || '',
        recipient_name: rProf?.full_name || rUser?.username || 'Team Member',
        recipient_email: rUser?.email || '',
      };
    });

    if (search) {
      const q = String(search).toLowerCase();
      results = results.filter(
        (e) =>
          e.subject.toLowerCase().includes(q) ||
          e.body.toLowerCase().includes(q) ||
          e.sender_name.toLowerCase().includes(q) ||
          e.recipient_name.toLowerCase().includes(q)
      );
    }

    results.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));

    // Calculate unread count for inbox
    const unreadInboxCount = db.internal_emails.filter(
      (e) => e.recipient_id === userId && !e.is_read && !e.is_draft && !e.is_archived_by_recipient && !e.is_deleted_by_recipient
    ).length;

    return res.json({
      success: true,
      count: results.length,
      unreadInboxCount,
      data: results,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve internal emails.' });
  }
};

export const getEmailById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const email = db.internal_emails.find((e) => e.id === id);
    if (!email) {
      return res.status(404).json({ success: false, message: 'Email not found.' });
    }

    if (email.sender_id !== userId && email.recipient_id !== userId && req.user?.role_name !== 'Super Admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this email.' });
    }

    // Mark as read if user is the recipient
    if (email.recipient_id === userId && !email.is_read) {
      email.is_read = true;
      db.save();
    }

    const sProf = db.employee_profiles.find((p) => p.user_id === email.sender_id);
    const sUser = db.users.find((u) => u.id === email.sender_id);
    const rProf = db.employee_profiles.find((p) => p.user_id === email.recipient_id);
    const rUser = db.users.find((u) => u.id === email.recipient_id);

    return res.json({
      success: true,
      data: {
        ...email,
        sender_name: sProf?.full_name || sUser?.username || 'Team Member',
        sender_email: sUser?.email || '',
        recipient_name: rProf?.full_name || rUser?.username || 'Team Member',
        recipient_email: rUser?.email || '',
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve email.' });
  }
};

export const sendEmail = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { recipient_id, subject, body, attachment_url, attachment_name, is_draft } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!is_draft && (!recipient_id || !subject || !body)) {
      return res.status(400).json({ success: false, message: 'Recipient, subject, and message body are required.' });
    }

    const now = new Date().toISOString();
    const newEmail: InternalEmail = {
      id: crypto.randomUUID(),
      sender_id: userId,
      recipient_id: recipient_id || userId,
      subject: subject ? String(subject).trim() : '(No subject)',
      body: body ? String(body).trim() : '',
      attachment_url: attachment_url || undefined,
      attachment_name: attachment_name || undefined,
      is_read: false,
      is_draft: Boolean(is_draft),
      is_archived_by_sender: false,
      is_archived_by_recipient: false,
      is_deleted_by_sender: false,
      is_deleted_by_recipient: false,
      created_at: now,
    };

    db.internal_emails.push(newEmail);

    if (!is_draft && recipient_id && recipient_id !== userId) {
      db.notifications.push({
        id: crypto.randomUUID(),
        user_id: recipient_id,
        type: 'EMAIL_RECEIVED',
        title: `Internal Mail: ${newEmail.subject}`,
        description: `New internal message received from ${req.user?.username}.`,
        entity_type: 'INTERNAL_EMAIL',
        entity_id: newEmail.id,
        is_read: false,
        created_at: now,
      });
    }

    db.save();

    logAudit(req, is_draft ? 'EMAIL_DRAFT_SAVED' : 'EMAIL_SENT', 'INTERNAL_EMAIL', newEmail.id, {
      subject: newEmail.subject,
      recipient_id,
    });

    return res.status(201).json({
      success: true,
      message: is_draft ? 'Draft saved.' : 'Message sent successfully.',
      data: newEmail,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to send email.' });
  }
};

export const updateEmailStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, is_read } = req.body;
    const userId = req.user?.id;

    const email = db.internal_emails.find((e) => e.id === id);
    if (!email) {
      return res.status(404).json({ success: false, message: 'Email not found.' });
    }

    const isSender = email.sender_id === userId;
    const isRecipient = email.recipient_id === userId;

    if (!isSender && !isRecipient) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    if (is_read !== undefined && isRecipient) {
      email.is_read = Boolean(is_read);
    }

    if (action === 'archive') {
      if (isSender) email.is_archived_by_sender = true;
      if (isRecipient) email.is_archived_by_recipient = true;
    } else if (action === 'unarchive') {
      if (isSender) email.is_archived_by_sender = false;
      if (isRecipient) email.is_archived_by_recipient = false;
    } else if (action === 'trash') {
      if (isSender) email.is_deleted_by_sender = true;
      if (isRecipient) email.is_deleted_by_recipient = true;
    } else if (action === 'restore') {
      if (isSender) email.is_deleted_by_sender = false;
      if (isRecipient) email.is_deleted_by_recipient = false;
    }

    db.save();

    return res.json({
      success: true,
      message: 'Email status updated.',
      data: email,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update email status.' });
  }
};
