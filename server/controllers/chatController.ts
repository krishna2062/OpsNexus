import { Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/db';
import { AuthRequest } from '../middleware/auth';
import { Conversation, ConversationMember, Message } from '../db/schema';

export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    // Find conversations where user is a member
    const memberConvIds = db.conversation_members.filter((cm) => cm.user_id === userId).map((cm) => cm.conversation_id);
    const conversations = db.conversations.filter((c) => memberConvIds.includes(c.id));

    const results = conversations.map((conv) => {
      const members = db.conversation_members.filter((cm) => cm.conversation_id === conv.id);
      const memberDetails = members.map((m) => {
        const u = db.users.find((user) => user.id === m.user_id);
        const p = db.employee_profiles.find((prof) => prof.user_id === m.user_id);
        return {
          ...m,
          user_name: p?.full_name || u?.username || 'User',
          profile_picture_url: p?.profile_picture_url || '',
        };
      });

      // Get last message
      const messages = db.messages.filter((m) => m.conversation_id === conv.id && !m.is_deleted);
      messages.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
      const lastMsg = messages[0];

      // Formulate title for direct message
      let title = conv.title;
      if (conv.type === 'direct') {
        const otherMember = memberDetails.find((m) => m.user_id !== userId);
        title = otherMember ? otherMember.user_name : 'Direct Conversation';
      }

      return {
        ...conv,
        title,
        members: memberDetails,
        last_message: lastMsg ? lastMsg.content : undefined,
        last_message_at: lastMsg ? lastMsg.created_at : conv.created_at,
        unread_count: 0, // dynamic
      };
    });

    results.sort((a, b) => (b.last_message_at > a.last_message_at ? 1 : -1));

    return res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve conversations.' });
  }
};

export const createConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { type, recipient_id, title, member_ids, project_id, department_id } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const now = new Date().toISOString();

    // Check if direct conversation already exists
    if (type === 'direct' && recipient_id) {
      const existingConv = db.conversations.find((c) => {
        if (c.type !== 'direct') return false;
        const members = db.conversation_members.filter((cm) => cm.conversation_id === c.id);
        const hasMe = members.some((m) => m.user_id === userId);
        const hasOther = members.some((m) => m.user_id === recipient_id);
        return hasMe && hasOther && members.length === 2;
      });

      if (existingConv) {
        return res.json({ success: true, data: existingConv });
      }
    }

    const newConv: Conversation = {
      id: crypto.randomUUID(),
      type: type || 'direct',
      title: title || (type === 'direct' ? 'Direct Message' : 'Team Chat'),
      project_id: project_id || null,
      department_id: department_id || null,
      created_by: userId,
      created_at: now,
      updated_at: now,
    };

    db.conversations.push(newConv);

    // Add creator as member
    db.conversation_members.push({
      id: crypto.randomUUID(),
      conversation_id: newConv.id,
      user_id: userId,
      joined_at: now,
      last_read_at: now,
    });

    // Add other members
    if (type === 'direct' && recipient_id) {
      db.conversation_members.push({
        id: crypto.randomUUID(),
        conversation_id: newConv.id,
        user_id: recipient_id,
        joined_at: now,
        last_read_at: now,
      });
    } else if (Array.isArray(member_ids)) {
      member_ids.forEach((id: string) => {
        if (id !== userId && !db.conversation_members.some((cm) => cm.conversation_id === newConv.id && cm.user_id === id)) {
          db.conversation_members.push({
            id: crypto.randomUUID(),
            conversation_id: newConv.id,
            user_id: id,
            joined_at: now,
            last_read_at: now,
          });
        }
      });
    }

    db.save();

    return res.status(201).json({
      success: true,
      message: 'Conversation started.',
      data: newConv,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to create conversation.' });
  }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Verify membership
    const isMember = db.conversation_members.some((cm) => cm.conversation_id === id && cm.user_id === userId);
    if (!isMember && req.user?.role_name !== 'Super Admin') {
      return res.status(403).json({ success: false, message: 'Access denied to this conversation.' });
    }

    const messages = db.messages
      .filter((m) => m.conversation_id === id && !m.is_deleted)
      .map((m) => {
        const senderUser = db.users.find((u) => u.id === m.sender_id);
        const senderProf = db.employee_profiles.find((p) => p.user_id === m.sender_id);

        return {
          ...m,
          sender_name: senderProf?.full_name || senderUser?.username || 'Team Member',
          sender_profile_picture: senderProf?.profile_picture_url || '',
        };
      });

    messages.sort((a, b) => (a.created_at > b.created_at ? 1 : -1));

    // Update last read
    const memberEntry = db.conversation_members.find((cm) => cm.conversation_id === id && cm.user_id === userId);
    if (memberEntry) {
      memberEntry.last_read_at = new Date().toISOString();
      db.save();
    }

    return res.json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve messages.' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content, message_type, attachment_url, attachment_name, attachment_size, reply_to_id } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!content && !attachment_url) {
      return res.status(400).json({ success: false, message: 'Message content or attachment is required.' });
    }

    const conv = db.conversations.find((c) => c.id === id);
    if (!conv) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const now = new Date().toISOString();
    const senderUser = db.users.find((u) => u.id === userId);
    const senderProf = db.employee_profiles.find((p) => p.user_id === userId);

    const newMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: id,
      sender_id: userId,
      sender_name: senderProf?.full_name || senderUser?.username || 'Team Member',
      content: content ? String(content).trim() : '',
      message_type: message_type || 'text',
      attachment_url: attachment_url || undefined,
      attachment_name: attachment_name || undefined,
      attachment_size: attachment_size ? Number(attachment_size) : undefined,
      is_deleted: false,
      reply_to_id: reply_to_id || null,
      created_at: now,
    };

    db.messages.push(newMsg);
    conv.updated_at = now;
    db.save();

    return res.status(201).json({
      success: true,
      data: {
        ...newMsg,
        sender_profile_picture: senderProf?.profile_picture_url || '',
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const msg = db.messages.find((m) => m.id === id);

    if (!msg) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    if (msg.sender_id !== userId && req.user?.role_name !== 'Super Admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this message.' });
    }

    msg.is_deleted = true;
    db.save();

    return res.json({ success: true, message: 'Message deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete message.' });
  }
};
