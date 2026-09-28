import { Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/db';
import { AuthRequest, logAudit } from '../middleware/auth';
import { Attendance } from '../db/schema';

// Helper to format date YYYY-MM-DD
const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const today = getTodayDateString();
    const record = db.attendance.find((a) => a.user_id === userId && a.date === today);

    return res.json({
      success: true,
      data: record || null,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch today attendance.' });
  }
};

export const checkIn = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { notes } = req.body;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const today = getTodayDateString();
    const existing = db.attendance.find((a) => a.user_id === userId && a.date === today);

    if (existing && existing.check_in_time) {
      return res.status(400).json({
        success: false,
        message: 'You have already checked in today.',
        data: existing,
      });
    }

    const now = new Date();
    const checkInTime = now.toISOString();

    // Determine status (check if late based on 09:15 threshold)
    const hours = now.getHours();
    const minutes = now.getMinutes();
    let status: 'Present' | 'Late' = 'Present';
    if (hours > 9 || (hours === 9 && minutes > 15)) {
      status = 'Late';
    }

    if (existing) {
      existing.check_in_time = checkInTime;
      existing.status = status;
      if (notes) existing.notes = notes;
      existing.updated_at = checkInTime;
      db.save();
      logAudit(req, 'ATTENDANCE_CHECK_IN', 'ATTENDANCE', existing.id, { date: today, time: checkInTime });
      return res.json({ success: true, message: 'Check-in recorded successfully.', data: existing });
    }

    const newRecord: Attendance = {
      id: crypto.randomUUID(),
      user_id: userId,
      date: today,
      check_in_time: checkInTime,
      check_out_time: null,
      total_working_hours: 0,
      status,
      notes: notes || '',
      created_at: checkInTime,
      updated_at: checkInTime,
    };

    db.attendance.push(newRecord);
    db.save();

    logAudit(req, 'ATTENDANCE_CHECK_IN', 'ATTENDANCE', newRecord.id, { date: today, time: checkInTime });

    return res.status(201).json({
      success: true,
      message: `Checked in successfully at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      data: newRecord,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to record check-in.' });
  }
};

export const checkOut = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { notes } = req.body;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const today = getTodayDateString();
    const record = db.attendance.find((a) => a.user_id === userId && a.date === today);

    if (!record || !record.check_in_time) {
      return res.status(400).json({
        success: false,
        message: 'No check-in record found for today. You must check in before checking out.',
      });
    }

    if (record.check_out_time) {
      return res.status(400).json({
        success: false,
        message: 'You have already checked out today.',
        data: record,
      });
    }

    const now = new Date();
    const checkOutTime = now.toISOString();
    const checkInMs = new Date(record.check_in_time).getTime();
    const checkOutMs = now.getTime();
    const totalHours = Math.max(0, (checkOutMs - checkInMs) / (1000 * 60 * 60));

    record.check_out_time = checkOutTime;
    record.total_working_hours = Math.round(totalHours * 100) / 100;
    if (totalHours < 4 && record.status === 'Present') {
      record.status = 'Half Day';
    }
    if (notes) {
      record.notes = record.notes ? `${record.notes} | Checkout: ${notes}` : notes;
    }
    record.updated_at = checkOutTime;

    db.save();

    logAudit(req, 'ATTENDANCE_CHECK_OUT', 'ATTENDANCE', record.id, {
      date: today,
      hours: record.total_working_hours,
    });

    return res.json({
      success: true,
      message: `Checked out successfully. Total hours: ${record.total_working_hours} hrs.`,
      data: record,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to record check-out.' });
  }
};

export const getAttendanceList = async (req: AuthRequest, res: Response) => {
  try {
    const isUserAdmin = req.user?.role_name === 'Super Admin' || req.user?.role_name === 'Admin / HR Manager';
    const { user_id, department_id, start_date, end_date, status } = req.query;

    let records = [...db.attendance];

    // Non-admin can only see their own attendance
    if (!isUserAdmin) {
      records = records.filter((r) => r.user_id === req.user?.id);
    } else if (user_id) {
      records = records.filter((r) => r.user_id === user_id);
    }

    if (start_date) {
      records = records.filter((r) => r.date >= String(start_date));
    }
    if (end_date) {
      records = records.filter((r) => r.date <= String(end_date));
    }
    if (status) {
      records = records.filter((r) => r.status === status);
    }

    // Join employee name and department
    const results = records.map((r) => {
      const profile = db.employee_profiles.find((p) => p.user_id === r.user_id);
      const user = db.users.find((u) => u.id === r.user_id);
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
      };
    });

    // Filter by department if requested
    const filtered = department_id ? results.filter((r) => r.department_id === department_id) : results;

    // Sort descending by date
    filtered.sort((a, b) => (b.date > a.date ? 1 : -1));

    return res.json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve attendance list.' });
  }
};

export const correctAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { check_in_time, check_out_time, status, total_working_hours, correction_reason } = req.body;

    if (!correction_reason) {
      return res.status(400).json({
        success: false,
        message: 'A correction reason is required for administrative audit tracking.',
      });
    }

    const record = db.attendance.find((a) => a.id === id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    if (check_in_time !== undefined) record.check_in_time = check_in_time;
    if (check_out_time !== undefined) record.check_out_time = check_out_time;
    if (status) record.status = status;
    if (total_working_hours !== undefined) record.total_working_hours = Number(total_working_hours);

    record.corrected_by = req.user?.id || null;
    record.correction_reason = correction_reason;
    record.updated_at = new Date().toISOString();

    db.save();

    logAudit(req, 'ATTENDANCE_CORRECTED', 'ATTENDANCE', id, { reason: correction_reason });

    return res.json({
      success: true,
      message: 'Attendance record updated successfully.',
      data: record,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to correct attendance.' });
  }
};

export const exportAttendanceCsv = async (req: AuthRequest, res: Response) => {
  try {
    const isUserAdmin = req.user?.role_name === 'Super Admin' || req.user?.role_name === 'Admin / HR Manager';
    if (!isUserAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    let records = [...db.attendance];
    records.sort((a, b) => (b.date > a.date ? 1 : -1));

    const csvRows = [
      ['Date', 'Employee ID', 'Employee Name', 'Department', 'Check-In', 'Check-Out', 'Total Hours', 'Status', 'Notes', 'Correction Reason'].join(','),
    ];

    records.forEach((r) => {
      const profile = db.employee_profiles.find((p) => p.user_id === r.user_id);
      const user = db.users.find((u) => u.id === r.user_id);
      const dept = profile?.department_id ? db.departments.find((d) => d.id === profile.department_id) : null;

      const row = [
        `"${r.date}"`,
        `"${profile?.employee_id || ''}"`,
        `"${(profile?.full_name || user?.username || '').replace(/"/g, '""')}"`,
        `"${(dept?.name || '').replace(/"/g, '""')}"`,
        `"${r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : ''}"`,
        `"${r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : ''}"`,
        `"${r.total_working_hours || 0}"`,
        `"${r.status}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`,
        `"${(r.correction_reason || '').replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${getTodayDateString()}.csv"`);
    return res.send(csvRows.join('\n'));
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to export CSV.' });
  }
};
