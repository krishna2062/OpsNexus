import { Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/db';
import { AuthRequest, logAudit } from '../middleware/auth';
import { LeaveRequest } from '../db/schema';

export const getLeaveTypes = async (req: AuthRequest, res: Response) => {
  try {
    return res.json({
      success: true,
      data: db.leave_types,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve leave types.' });
  }
};

export const getLeaves = async (req: AuthRequest, res: Response) => {
  try {
    const isUserAdmin = req.user?.role_name === 'Super Admin' || req.user?.role_name === 'Admin / HR Manager';
    const { status, user_id, department_id } = req.query;

    let requests = [...db.leave_requests];

    if (!isUserAdmin) {
      requests = requests.filter((r) => r.user_id === req.user?.id);
    } else if (user_id) {
      requests = requests.filter((r) => r.user_id === user_id);
    }

    if (status) {
      requests = requests.filter((r) => r.status === status);
    }

    // Join details
    const results = requests.map((r) => {
      const profile = db.employee_profiles.find((p) => p.user_id === r.user_id);
      const user = db.users.find((u) => u.id === r.user_id);
      const reviewer = r.reviewed_by ? db.users.find((u) => u.id === r.reviewed_by) : null;
      const reviewerProfile = r.reviewed_by ? db.employee_profiles.find((p) => p.user_id === r.reviewed_by) : null;
      let deptName = '';
      if (profile?.department_id) {
        const dept = db.departments.find((d) => d.id === profile.department_id);
        deptName = dept?.name || '';
      }

      return {
        ...r,
        employee_name: profile?.full_name || user?.username || 'Employee',
        employee_id_code: profile?.employee_id || '',
        department_name: deptName,
        department_id: profile?.department_id || null,
        reviewed_by_name: reviewerProfile?.full_name || reviewer?.username || undefined,
      };
    });

    const filtered = department_id ? results.filter((r) => r.department_id === department_id) : results;
    filtered.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));

    return res.json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve leave requests.' });
  }
};

export const submitLeave = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { leave_type_id, start_date, end_date, reason, attachment_url } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!leave_type_id || !start_date || !end_date || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Leave type, start date, end date, and reason are required.',
      });
    }

    const leaveType = db.leave_types.find((lt) => lt.id === leave_type_id);
    if (!leaveType) {
      return res.status(400).json({ success: false, message: 'Invalid leave type selected.' });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    if (end < start) {
      return res.status(400).json({ success: false, message: 'End date cannot be prior to start date.' });
    }

    const days = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
    const now = new Date().toISOString();

    const newRequest: LeaveRequest = {
      id: crypto.randomUUID(),
      user_id: userId,
      leave_type_id,
      leave_type_name: leaveType.name,
      start_date,
      end_date,
      number_of_days: days,
      reason: String(reason).trim(),
      attachment_url: attachment_url || undefined,
      status: 'Pending',
      created_at: now,
      updated_at: now,
    };

    db.leave_requests.push(newRequest);
    db.save();

    // Notify admins
    const adminRoles = db.roles.filter((r) => r.name === 'Super Admin' || r.name === 'Admin / HR Manager').map((r) => r.id);
    const admins = db.users.filter((u) => adminRoles.includes(u.role_id));
    const userProfile = db.employee_profiles.find((p) => p.user_id === userId);

    admins.forEach((admin) => {
      db.notifications.push({
        id: crypto.randomUUID(),
        user_id: admin.id,
        type: 'LEAVE_SUBMITTED',
        title: 'New Leave Request Submitted',
        description: `${userProfile?.full_name || req.user?.username} submitted a request for ${days} day(s) of ${leaveType.name}.`,
        entity_type: 'LEAVE',
        entity_id: newRequest.id,
        is_read: false,
        created_at: now,
      });
    });
    db.save();

    logAudit(req, 'LEAVE_REQUESTED', 'LEAVE', newRequest.id, { days, type: leaveType.name });

    return res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully and forwarded for review.',
      data: newRequest,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to submit leave request.' });
  }
};

export const reviewLeave = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, review_remarks } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'Approved' or 'Rejected'." });
    }

    const leave = db.leave_requests.find((l) => l.id === id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    const now = new Date().toISOString();
    leave.status = status;
    leave.reviewed_by = req.user?.id || null;
    leave.review_remarks = review_remarks || '';
    leave.reviewed_at = now;
    leave.updated_at = now;

    // If approved, automatically reflect in attendance table for those dates!
    if (status === 'Approved') {
      const cur = new Date(leave.start_date);
      const end = new Date(leave.end_date);

      while (cur <= end) {
        const dateStr = cur.toISOString().split('T')[0];
        const existingAtt = db.attendance.find((a) => a.user_id === leave.user_id && a.date === dateStr);
        if (existingAtt) {
          existingAtt.status = 'Leave';
          existingAtt.notes = `Approved leave: ${leave.leave_type_name}`;
          existingAtt.updated_at = now;
        } else {
          db.attendance.push({
            id: crypto.randomUUID(),
            user_id: leave.user_id,
            date: dateStr,
            check_in_time: null,
            check_out_time: null,
            total_working_hours: 0,
            status: 'Leave',
            notes: `Approved leave: ${leave.leave_type_name}`,
            created_at: now,
            updated_at: now,
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    // Send notification to employee
    db.notifications.push({
      id: crypto.randomUUID(),
      user_id: leave.user_id,
      type: status === 'Approved' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
      title: `Leave Request ${status}`,
      description: `Your leave request for ${leave.number_of_days} day(s) from ${leave.start_date} to ${leave.end_date} has been ${status.toLowerCase()}. ${review_remarks ? `Remarks: "${review_remarks}"` : ''}`,
      entity_type: 'LEAVE',
      entity_id: leave.id,
      is_read: false,
      created_at: now,
    });

    db.save();

    logAudit(req, `LEAVE_${status.toUpperCase()}`, 'LEAVE', leave.id, { remarks: review_remarks });

    return res.json({
      success: true,
      message: `Leave request has been ${status.toLowerCase()}.`,
      data: leave,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to review leave request.' });
  }
};

export const cancelLeave = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const leave = db.leave_requests.find((l) => l.id === id);

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    if (leave.user_id !== req.user?.id && req.user?.role_name !== 'Super Admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to cancel this request.' });
    }

    if (leave.status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Cannot cancel a leave request that is already ${leave.status}.` });
    }

    leave.status = 'Cancelled';
    leave.updated_at = new Date().toISOString();
    db.save();

    logAudit(req, 'LEAVE_CANCELLED', 'LEAVE', id);

    return res.json({
      success: true,
      message: 'Leave request cancelled successfully.',
      data: leave,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to cancel leave request.' });
  }
};
