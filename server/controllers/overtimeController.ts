import { Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/db';
import { AuthRequest, logAudit } from '../middleware/auth';
import { OvertimeRecord } from '../db/schema';

export const getOvertimeList = async (req: AuthRequest, res: Response) => {
  try {
    const isUserAdmin = req.user?.role_name === 'Super Admin' || req.user?.role_name === 'Admin / HR Manager';
    const userId = req.user?.id;
    const { status, user_id } = req.query;

    let records = [...db.overtime_records];

    if (!isUserAdmin) {
      records = records.filter((r) => r.user_id === userId);
    } else if (user_id) {
      records = records.filter((r) => r.user_id === user_id);
    }

    if (status) {
      records = records.filter((r) => r.status === status);
    }

    const results = records.map((r) => {
      const profile = db.employee_profiles.find((p) => p.user_id === r.user_id);
      const user = db.users.find((u) => u.id === r.user_id);

      return {
        ...r,
        employee_name: profile?.full_name || user?.username || 'Employee',
        employee_id_code: profile?.employee_id || '',
      };
    });

    results.sort((a, b) => (b.date > a.date ? 1 : -1));

    return res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve overtime records.' });
  }
};

export const submitOvertime = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { date, start_time, end_time, total_hours, hourly_rate, reason } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!date || !start_time || !end_time || !total_hours) {
      return res.status(400).json({
        success: false,
        message: 'Date, start time, end time, and total hours are required.',
      });
    }

    const hours = Number(total_hours) || 0;
    // Default rate if not provided: calculate standard base rate from employee's monthly basic salary (assuming 160 hrs/mo * 1.5 OT multiplier)
    const profile = db.employee_profiles.find((p) => p.user_id === userId);
    let rate = Number(hourly_rate);
    if (!rate || isNaN(rate)) {
      const basic = profile?.basic_salary || 0;
      rate = basic > 0 ? Math.round((basic / 160) * 1.5 * 100) / 100 : 25.0;
    }

    const totalAmount = Math.round(hours * rate * 100) / 100;
    const now = new Date().toISOString();

    const record: OvertimeRecord = {
      id: crypto.randomUUID(),
      user_id: userId,
      date,
      start_time,
      end_time,
      total_hours: hours,
      hourly_rate: rate,
      total_amount: totalAmount,
      reason: reason || '',
      status: 'Pending',
      created_at: now,
    };

    db.overtime_records.push(record);
    db.save();

    logAudit(req, 'OVERTIME_REQUESTED', 'OVERTIME', record.id, { hours, totalAmount });

    return res.status(201).json({
      success: true,
      message: 'Overtime claim submitted for approval.',
      data: record,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to submit overtime claim.' });
  }
};

export const reviewOvertime = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'Approved' or 'Rejected'." });
    }

    const record = db.overtime_records.find((r) => r.id === id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Overtime record not found.' });
    }

    record.status = status;
    record.reviewed_by = req.user?.id || null;
    record.reviewed_at = new Date().toISOString();

    // Notify employee
    db.notifications.push({
      id: crypto.randomUUID(),
      user_id: record.user_id,
      type: status === 'Approved' ? 'OVERTIME_APPROVED' : 'OVERTIME_REJECTED',
      title: `Overtime Claim ${status}`,
      description: `Your overtime claim for ${record.total_hours} hrs on ${record.date} ($${record.total_amount}) has been ${status.toLowerCase()}.`,
      entity_type: 'OVERTIME',
      entity_id: record.id,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    db.save();

    logAudit(req, `OVERTIME_${status.toUpperCase()}`, 'OVERTIME', id, { amount: record.total_amount });

    return res.json({
      success: true,
      message: `Overtime claim ${status.toLowerCase()}.`,
      data: record,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to review overtime claim.' });
  }
};
