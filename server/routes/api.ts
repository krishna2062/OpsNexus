import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

import { authenticateJWT, requireRoles } from '../middleware/auth';
import * as authController from '../controllers/authController';
import * as employeeController from '../controllers/employeeController';
import * as departmentController from '../controllers/departmentController';
import * as attendanceController from '../controllers/attendanceController';
import * as leaveController from '../controllers/leaveController';
import * as projectController from '../controllers/projectController';
import * as taskController from '../controllers/taskController';
import * as payrollController from '../controllers/payrollController';
import * as overtimeController from '../controllers/overtimeController';
import * as chatController from '../controllers/chatController';
import * as internalMailController from '../controllers/internalMailController';
import * as fileController from '../controllers/fileController';
import * as notificationController from '../controllers/notificationController';
import * as announcementController from '../controllers/announcementController';
import * as reportController from '../controllers/reportController';
import * as auditLogController from '../controllers/auditLogController';
import * as settingsController from '../controllers/settingsController';
import * as searchController from '../controllers/searchController';

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const uploadDir = isVercel ? path.resolve('/tmp', 'uploads') : path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    console.error('[Uploads] Could not create upload directory:', err);
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const hash = crypto.randomBytes(12).toString('hex');
    cb(null, `${Date.now()}-${hash}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
});

const router = express.Router();

// -----------------------------------------------------------------------------
// 1. AUTHENTICATION & PROFILE
// -----------------------------------------------------------------------------
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refreshToken);
router.post('/auth/first-login-password-change', authenticateJWT, authController.firstLoginPasswordChange);
router.post('/auth/change-password', authenticateJWT, authController.changePassword);
router.post('/auth/logout', authenticateJWT, authController.logout);
router.get('/auth/me', authenticateJWT, authController.getMe);

// -----------------------------------------------------------------------------
// 2. EMPLOYEES & STAFF ACCOUNTS
// -----------------------------------------------------------------------------
router.get('/employees', authenticateJWT, employeeController.getEmployees);
router.get('/employees/:id', authenticateJWT, employeeController.getEmployeeById);
router.post('/employees', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager']), employeeController.createEmployee);
router.put('/employees/:id', authenticateJWT, employeeController.updateEmployee);
router.patch('/employees/:id/status', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager']), employeeController.updateEmployeeStatus);
router.post('/employees/:id/reset-password', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager']), employeeController.resetEmployeePassword);

// -----------------------------------------------------------------------------
// 3. DEPARTMENTS
// -----------------------------------------------------------------------------
router.get('/departments', authenticateJWT, departmentController.getDepartments);
router.post('/departments', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager']), departmentController.createDepartment);
router.put('/departments/:id', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager']), departmentController.updateDepartment);
router.delete('/departments/:id', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager']), departmentController.deleteDepartment);

// -----------------------------------------------------------------------------
// 4. ATTENDANCE SYSTEM
// -----------------------------------------------------------------------------
router.get('/attendance/today', authenticateJWT, attendanceController.getTodayAttendance);
router.post('/attendance/check-in', authenticateJWT, attendanceController.checkIn);
router.post('/attendance/check-out', authenticateJWT, attendanceController.checkOut);
router.get('/attendance', authenticateJWT, attendanceController.getAttendanceList);
router.put('/attendance/:id/correct', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager']), attendanceController.correctAttendance);
router.get('/attendance/export', authenticateJWT, attendanceController.exportAttendanceCsv);

// -----------------------------------------------------------------------------
// 5. LEAVE MANAGEMENT
// -----------------------------------------------------------------------------
router.get('/leaves/types', authenticateJWT, leaveController.getLeaveTypes);
router.get('/leaves', authenticateJWT, leaveController.getLeaves);
router.post('/leaves', authenticateJWT, leaveController.submitLeave);
router.patch('/leaves/:id/review', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager', 'Team Lead']), leaveController.reviewLeave);
router.patch('/leaves/:id/cancel', authenticateJWT, leaveController.cancelLeave);

// -----------------------------------------------------------------------------
// 6. PROJECTS & DISTRIBUTION
// -----------------------------------------------------------------------------
router.get('/projects', authenticateJWT, projectController.getProjects);
router.get('/projects/:id', authenticateJWT, projectController.getProjectById);
router.post('/projects', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager', 'Project Manager']), projectController.createProject);
router.put('/projects/:id', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager', 'Project Manager']), projectController.updateProject);
router.delete('/projects/:id', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager']), projectController.deleteProject);
router.post('/projects/:id/members', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager', 'Project Manager']), projectController.addProjectMember);
router.delete('/projects/:id/members/:userId', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager', 'Project Manager']), projectController.removeProjectMember);

// -----------------------------------------------------------------------------
// 7. TASK MANAGEMENT & WORKFLOW
// -----------------------------------------------------------------------------
router.get('/tasks', authenticateJWT, taskController.getTasks);
router.get('/tasks/:id', authenticateJWT, taskController.getTaskById);
router.post('/tasks', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager', 'Project Manager', 'Team Lead']), taskController.createTask);
router.put('/tasks/:id', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager', 'Project Manager', 'Team Lead']), taskController.updateTask);
router.patch('/tasks/:id/status', authenticateJWT, taskController.updateTaskStatus);
router.post('/tasks/:id/comments', authenticateJWT, taskController.addTaskComment);
router.delete('/tasks/:id', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager', 'Project Manager']), taskController.deleteTask);

// -----------------------------------------------------------------------------
// 8. PAYROLL & SALARY
// -----------------------------------------------------------------------------
router.get('/payroll', authenticateJWT, payrollController.getPayrolls);
router.post('/payroll', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager']), payrollController.createPayrollRecord);
router.post('/payroll/generate-monthly', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager']), payrollController.generateMonthlyPayroll);
router.patch('/payroll/:id/status', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager']), payrollController.updatePayrollStatus);
router.get('/payroll/summary', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager']), payrollController.getPayrollSummary);

// -----------------------------------------------------------------------------
// 9. OVERTIME
// -----------------------------------------------------------------------------
router.get('/overtime', authenticateJWT, overtimeController.getOvertimeList);
router.post('/overtime', authenticateJWT, overtimeController.submitOvertime);
router.patch('/overtime/:id/review', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager', 'Project Manager', 'Team Lead']), overtimeController.reviewOvertime);

// -----------------------------------------------------------------------------
// 10. REAL-TIME TEAM CHAT
// -----------------------------------------------------------------------------
router.get('/chat/conversations', authenticateJWT, chatController.getConversations);
router.post('/chat/conversations', authenticateJWT, chatController.createConversation);
router.get('/chat/conversations/:id/messages', authenticateJWT, chatController.getMessages);
router.post('/chat/conversations/:id/messages', authenticateJWT, chatController.sendMessage);
router.delete('/chat/messages/:id', authenticateJWT, chatController.deleteMessage);

// -----------------------------------------------------------------------------
// 11. COMPANY INTERNAL EMAIL
// -----------------------------------------------------------------------------
router.get('/mail', authenticateJWT, internalMailController.getEmails);
router.get('/mail/:id', authenticateJWT, internalMailController.getEmailById);
router.post('/mail', authenticateJWT, internalMailController.sendEmail);
router.patch('/mail/:id', authenticateJWT, internalMailController.updateEmailStatus);

// -----------------------------------------------------------------------------
// 12. CENTRALIZED FILE VAULT
// -----------------------------------------------------------------------------
router.get('/files', authenticateJWT, fileController.getFiles);
router.post('/files/upload', authenticateJWT, upload.single('file'), fileController.uploadFile);
router.get('/files/download/:filename', fileController.downloadFile);
router.delete('/files/:id', authenticateJWT, fileController.deleteFile);

// -----------------------------------------------------------------------------
// 13. NOTIFICATIONS & ANNOUNCEMENTS
// -----------------------------------------------------------------------------
router.get('/notifications', authenticateJWT, notificationController.getNotifications);
router.patch('/notifications/read-all', authenticateJWT, notificationController.markAllNotificationsRead);
router.patch('/notifications/:id/read', authenticateJWT, notificationController.markNotificationRead);

router.get('/announcements', authenticateJWT, announcementController.getAnnouncements);
router.post('/announcements', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager']), announcementController.createAnnouncement);
router.delete('/announcements/:id', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager']), announcementController.deleteAnnouncement);

// -----------------------------------------------------------------------------
// 14. REPORTS & ANALYTICS
// -----------------------------------------------------------------------------
router.get('/reports/dashboard', authenticateJWT, reportController.getDashboardStats);
router.get('/reports/attendance', authenticateJWT, reportController.getAttendanceReport);

// -----------------------------------------------------------------------------
// 15. AUDIT LOGS
// -----------------------------------------------------------------------------
router.get('/audit-logs', authenticateJWT, requireRoles(['Super Admin', 'Admin / HR Manager']), auditLogController.getAuditLogs);

// -----------------------------------------------------------------------------
// 16. COMPANY SETTINGS & SUPABASE
// -----------------------------------------------------------------------------
router.get('/settings', authenticateJWT, settingsController.getSettings);
router.put('/settings/profile', authenticateJWT, requireRoles(['Super Admin']), settingsController.updateCompanyProfile);
router.get('/settings/supabase-sql', authenticateJWT, settingsController.getSupabaseSql);
router.post('/settings/test-supabase', authenticateJWT, settingsController.testSupabaseConnection);

// -----------------------------------------------------------------------------
// 17. GLOBAL SEARCH
// -----------------------------------------------------------------------------
router.get('/search', authenticateJWT, searchController.globalSearch);

export default router;
