import { Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/db';
import { AuthRequest, logAudit } from '../middleware/auth';
import { Payroll } from '../db/schema';

export const getPayrolls = async (req: AuthRequest, res: Response) => {
  try {
    const isUserAdmin = req.user?.role_name === 'Super Admin' || req.user?.role_name === 'Admin / HR Manager';
    const userId = req.user?.id;
    const { month_year, user_id, status } = req.query;

    let records = [...db.payroll];

    // CRITICAL SECURITY REQUIREMENT:
    // Non-admins can ONLY view their own payroll records!
    if (!isUserAdmin) {
      records = records.filter((p) => p.user_id === userId);
    } else if (user_id) {
      records = records.filter((p) => p.user_id === user_id);
    }

    if (month_year) {
      records = records.filter((p) => p.month_year === month_year);
    }
    if (status) {
      records = records.filter((p) => p.payment_status === status);
    }

    const results = records.map((p) => {
      const profile = db.employee_profiles.find((prof) => prof.user_id === p.user_id);
      const user = db.users.find((u) => u.id === p.user_id);
      const dept = profile?.department_id ? db.departments.find((d) => d.id === profile.department_id) : null;

      return {
        ...p,
        employee_name: profile?.full_name || user?.username || 'Employee',
        employee_id_code: profile?.employee_id || '',
        department_name: dept?.name || '',
      };
    });

    results.sort((a, b) => (b.month_year > a.month_year ? 1 : -1));

    return res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve payroll records.' });
  }
};

export const createPayrollRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, month_year, basic_salary, allowances, bonus, overtime_pay, deductions, tax, payment_date, notes } = req.body;

    if (!user_id || !month_year) {
      return res.status(400).json({ success: false, message: 'Employee and payroll month (YYYY-MM) are required.' });
    }

    const existing = db.payroll.find((p) => p.user_id === user_id && p.month_year === month_year);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A payroll entry for this employee for month ${month_year} already exists.`,
      });
    }

    const bSalary = Number(basic_salary) || 0;
    const allow = Number(allowances) || 0;
    const bon = Number(bonus) || 0;
    const ot = Number(overtime_pay) || 0;
    const ded = Number(deductions) || 0;
    const tx = Number(tax) || 0;
    const net = bSalary + allow + bon + ot - ded - tx;

    const now = new Date().toISOString();
    const newRecord: Payroll = {
      id: crypto.randomUUID(),
      user_id,
      month_year,
      basic_salary: bSalary,
      allowances: allow,
      bonus: bon,
      overtime_pay: ot,
      deductions: ded,
      tax: tx,
      net_salary: Math.max(0, net),
      payment_date: payment_date || undefined,
      payment_status: 'Pending',
      notes: notes || '',
      created_by: req.user?.id || null,
      created_at: now,
      updated_at: now,
    };

    db.payroll.push(newRecord);

    // Notify employee of payroll generation
    db.notifications.push({
      id: crypto.randomUUID(),
      user_id,
      type: 'PAYROLL_GENERATED',
      title: 'Monthly Payslip Generated',
      description: `Your payslip for ${month_year} has been created with net pay of $${newRecord.net_salary.toLocaleString()}.`,
      entity_type: 'PAYROLL',
      entity_id: newRecord.id,
      is_read: false,
      created_at: now,
    });

    db.save();

    logAudit(req, 'PAYROLL_CREATED', 'PAYROLL', newRecord.id, { user_id, month_year, net_salary: newRecord.net_salary });

    return res.status(201).json({
      success: true,
      message: 'Payroll record created successfully.',
      data: newRecord,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to create payroll record.' });
  }
};

export const generateMonthlyPayroll = async (req: AuthRequest, res: Response) => {
  try {
    const { month_year } = req.body;
    if (!month_year) {
      return res.status(400).json({ success: false, message: 'Month year (YYYY-MM) is required.' });
    }

    const activeUsers = db.users.filter((u) => u.status === 'Active');
    let generatedCount = 0;
    const now = new Date().toISOString();

    activeUsers.forEach((user) => {
      const alreadyHas = db.payroll.some((p) => p.user_id === user.id && p.month_year === month_year);
      if (!alreadyHas) {
        const profile = db.employee_profiles.find((p) => p.user_id === user.id);
        const baseSalary = profile?.basic_salary || 0;

        // Sum approved overtime for this user in this month
        const userOvertimes = db.overtime_records.filter(
          (ot) => ot.user_id === user.id && ot.status === 'Approved' && ot.date.startsWith(month_year)
        );
        const totalOtPay = userOvertimes.reduce((acc, ot) => acc + (ot.total_amount || 0), 0);

        const tax = Math.round(baseSalary * 0.08 * 100) / 100; // standard 8% estimated tax
        const net = Math.max(0, baseSalary + totalOtPay - tax);

        const record: Payroll = {
          id: crypto.randomUUID(),
          user_id: user.id,
          month_year,
          basic_salary: baseSalary,
          allowances: 0,
          bonus: 0,
          overtime_pay: totalOtPay,
          deductions: 0,
          tax,
          net_salary: net,
          payment_status: 'Pending',
          notes: `Batch-generated payroll for ${month_year}`,
          created_by: req.user?.id || null,
          created_at: now,
          updated_at: now,
        };

        db.payroll.push(record);

        db.notifications.push({
          id: crypto.randomUUID(),
          user_id: user.id,
          type: 'PAYROLL_GENERATED',
          title: `Payslip for ${month_year}`,
          description: `Your monthly statement for ${month_year} is ready for review.`,
          entity_type: 'PAYROLL',
          entity_id: record.id,
          is_read: false,
          created_at: now,
        });

        generatedCount++;
      }
    });

    db.save();

    logAudit(req, 'BATCH_PAYROLL_GENERATED', 'PAYROLL', undefined, { month_year, generatedCount });

    return res.json({
      success: true,
      message: `Generated ${generatedCount} payroll record(s) for ${month_year}.`,
      generatedCount,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to generate monthly payroll.' });
  }
};

export const updatePayrollStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { payment_status, payment_date, notes } = req.body;

    if (!['Pending', 'Processed', 'Paid'].includes(payment_status)) {
      return res.status(400).json({ success: false, message: "Invalid status. Must be 'Pending', 'Processed', or 'Paid'." });
    }

    const record = db.payroll.find((p) => p.id === id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Payroll record not found.' });
    }

    record.payment_status = payment_status;
    if (payment_date) record.payment_date = payment_date;
    if (notes !== undefined) record.notes = notes;
    record.updated_at = new Date().toISOString();

    if (payment_status === 'Paid') {
      db.notifications.push({
        id: crypto.randomUUID(),
        user_id: record.user_id,
        type: 'PAYROLL_PAID',
        title: 'Salary Disbursed',
        description: `Your salary for ${record.month_year} of $${record.net_salary.toLocaleString()} has been marked as Paid.`,
        entity_type: 'PAYROLL',
        entity_id: record.id,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }

    db.save();

    logAudit(req, 'PAYROLL_STATUS_UPDATED', 'PAYROLL', id, { newStatus: payment_status });

    return res.json({
      success: true,
      message: `Payroll status updated to ${payment_status}.`,
      data: record,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update payroll status.' });
  }
};

export const getPayrollSummary = async (req: AuthRequest, res: Response) => {
  try {
    const totalPayrollPaid = db.payroll
      .filter((p) => p.payment_status === 'Paid')
      .reduce((sum, p) => sum + (p.net_salary || 0), 0);

    const totalPendingPayroll = db.payroll
      .filter((p) => p.payment_status !== 'Paid')
      .reduce((sum, p) => sum + (p.net_salary || 0), 0);

    const totalOvertimeCost = db.overtime_records
      .filter((ot) => ot.status === 'Approved')
      .reduce((sum, ot) => sum + (ot.total_amount || 0), 0);

    return res.json({
      success: true,
      data: {
        totalPayrollPaid: Math.round(totalPayrollPaid * 100) / 100,
        totalPendingPayroll: Math.round(totalPendingPayroll * 100) / 100,
        totalOvertimeCost: Math.round(totalOvertimeCost * 100) / 100,
        totalRecords: db.payroll.length,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to compute payroll summary.' });
  }
};
