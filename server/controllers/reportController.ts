import { Response } from 'express';
import { db } from '../db/db';
import { AuthRequest } from '../middleware/auth';

const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentMonthString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const isUserAdmin = req.user?.role_name === 'Super Admin' || req.user?.role_name === 'Admin / HR Manager';
    const userId = req.user?.id;
    const today = getTodayDateString();
    const currentMonth = getCurrentMonthString();

    // 1. Employees stats
    const totalEmployees = db.users.length;
    const activeEmployees = db.users.filter((u) => u.status === 'Active').length;

    // 2. Today's attendance stats
    const todayAttendance = db.attendance.filter((a) => a.date === today);
    const presentToday = todayAttendance.filter((a) => a.status === 'Present' || a.status === 'Late').length;
    const onLeaveToday = todayAttendance.filter((a) => a.status === 'Leave').length;
    // Absent is active employees minus present and minus on leave
    const absentToday = Math.max(0, activeEmployees - (presentToday + onLeaveToday));

    // 3. Projects stats
    let relevantProjects = [...db.projects];
    if (!isUserAdmin && userId) {
      relevantProjects = relevantProjects.filter(
        (p) => p.project_manager_id === userId || db.project_members.some((pm) => pm.project_id === p.id && pm.user_id === userId)
      );
    }
    const totalProjects = relevantProjects.length;
    const activeProjects = relevantProjects.filter((p) => p.status === 'In Progress' || p.status === 'Review').length;
    const completedProjects = relevantProjects.filter((p) => p.status === 'Completed').length;
    const pendingProjects = relevantProjects.filter((p) => p.status === 'Planning' || p.status === 'Pending').length;
    const overdueProjects = relevantProjects.filter((p) => p.deadline && p.deadline < today && p.status !== 'Completed').length;

    // 4. Tasks stats
    let relevantTasks = [...db.tasks];
    if (!isUserAdmin && userId) {
      relevantTasks = relevantTasks.filter((t) => t.assigned_to === userId || t.assigned_by === userId);
    }
    const totalTasks = relevantTasks.length;
    const pendingTasks = relevantTasks.filter((t) => t.status === 'Pending').length;
    const inProgressTasks = relevantTasks.filter((t) => t.status === 'In Progress' || t.status === 'Accepted').length;
    const completedTasks = relevantTasks.filter((t) => t.status === 'Completed').length;
    const overdueTasks = relevantTasks.filter((t) => t.deadline && t.deadline < today && t.status !== 'Completed').length;

    // 5. Leave requests stats
    let relevantLeaves = [...db.leave_requests];
    if (!isUserAdmin && userId) {
      relevantLeaves = relevantLeaves.filter((l) => l.user_id === userId);
    }
    const pendingLeaveRequests = relevantLeaves.filter((l) => l.status === 'Pending').length;

    // 6. Monthly Payroll & Overtime stats (Admin only or own)
    let monthlyPayrollTotal = 0;
    if (isUserAdmin) {
      const monthPayrolls = db.payroll.filter((p) => p.month_year === currentMonth);
      monthlyPayrollTotal = monthPayrolls.reduce((sum, p) => sum + (p.net_salary || 0), 0);
    } else if (userId) {
      const myPayroll = db.payroll.find((p) => p.user_id === userId && p.month_year === currentMonth);
      monthlyPayrollTotal = myPayroll ? myPayroll.net_salary : 0;
    }

    const currentMonthOvertime = db.overtime_records.filter(
      (ot) => ot.date.startsWith(currentMonth) && ot.status === 'Approved' && (isUserAdmin || ot.user_id === userId)
    );
    const monthlyOvertimeHours = currentMonthOvertime.reduce((sum, ot) => sum + (ot.total_hours || 0), 0);
    const monthlyOvertimeCost = currentMonthOvertime.reduce((sum, ot) => sum + (ot.total_amount || 0), 0);

    // 7. Recent activities (Audit logs)
    let recentActivities = db.audit_logs.slice(0, 8);
    if (!isUserAdmin && userId) {
      recentActivities = db.audit_logs.filter((a) => a.user_id === userId).slice(0, 8);
    }

    // 8. Project status chart breakdown
    const projectStatusDistribution = [
      { name: 'Planning', count: relevantProjects.filter((p) => p.status === 'Planning').length },
      { name: 'Pending', count: relevantProjects.filter((p) => p.status === 'Pending').length },
      { name: 'In Progress', count: relevantProjects.filter((p) => p.status === 'In Progress').length },
      { name: 'Review', count: relevantProjects.filter((p) => p.status === 'Review').length },
      { name: 'Completed', count: relevantProjects.filter((p) => p.status === 'Completed').length },
      { name: 'On Hold', count: relevantProjects.filter((p) => p.status === 'On Hold').length },
    ];

    // 9. Task status breakdown
    const taskStatusDistribution = [
      { name: 'Pending', count: relevantTasks.filter((t) => t.status === 'Pending').length },
      { name: 'In Progress', count: relevantTasks.filter((t) => t.status === 'In Progress' || t.status === 'Accepted').length },
      { name: 'Under Review', count: relevantTasks.filter((t) => t.status === 'Submitted for Review').length },
      { name: 'Completed', count: relevantTasks.filter((t) => t.status === 'Completed').length },
    ];

    return res.json({
      success: true,
      data: {
        summary: {
          totalEmployees,
          activeEmployees,
          presentToday,
          absentToday,
          onLeaveToday,
          totalProjects,
          activeProjects,
          completedProjects,
          pendingProjects,
          overdueProjects,
          totalTasks,
          pendingTasks,
          inProgressTasks,
          completedTasks,
          overdueTasks,
          pendingLeaveRequests,
          monthlyPayroll: Math.round(monthlyPayrollTotal * 100) / 100,
          monthlyOvertimeHours,
          monthlyOvertimeCost: Math.round(monthlyOvertimeCost * 100) / 100,
        },
        charts: {
          projectStatusDistribution,
          taskStatusDistribution,
        },
        recentActivities,
      },
    });
  } catch (err: any) {
    console.error('[Dashboard Stats Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve dashboard analytics.' });
  }
};

export const getAttendanceReport = async (req: AuthRequest, res: Response) => {
  try {
    const { start_date, end_date, department_id } = req.query;
    let records = [...db.attendance];

    if (start_date) records = records.filter((r) => r.date >= String(start_date));
    if (end_date) records = records.filter((r) => r.date <= String(end_date));

    const totalDays = records.length;
    const presentCount = records.filter((r) => r.status === 'Present' || r.status === 'Late').length;
    const lateCount = records.filter((r) => r.status === 'Late').length;
    const halfDayCount = records.filter((r) => r.status === 'Half Day').length;
    const leaveCount = records.filter((r) => r.status === 'Leave').length;
    const totalWorkingHours = records.reduce((sum, r) => sum + (r.total_working_hours || 0), 0);

    return res.json({
      success: true,
      data: {
        totalRecords: totalDays,
        presentCount,
        lateCount,
        halfDayCount,
        leaveCount,
        totalWorkingHours: Math.round(totalWorkingHours * 10) / 10,
        averageHoursPerDay: presentCount > 0 ? Math.round((totalWorkingHours / presentCount) * 10) / 10 : 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to generate attendance report.' });
  }
};
