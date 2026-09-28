import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  User,
  Role,
  Permission,
  RolePermission,
  Department,
  EmployeeProfile,
  Attendance,
  LeaveType,
  LeaveRequest,
  Project,
  ProjectMember,
  Task,
  TaskComment,
  Payroll,
  OvertimeRecord,
  Conversation,
  ConversationMember,
  Message,
  InternalEmail,
  FileRecord,
  Notification,
  Announcement,
  AuditLog,
  CompanySetting,
} from './schema';
import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase';

interface DatabaseData {
  roles: Role[];
  permissions: Permission[];
  role_permissions: RolePermission[];
  users: User[];
  departments: Department[];
  employee_profiles: EmployeeProfile[];
  attendance: Attendance[];
  leave_types: LeaveType[];
  leave_requests: LeaveRequest[];
  projects: Project[];
  project_members: ProjectMember[];
  tasks: Task[];
  task_comments: TaskComment[];
  payroll: Payroll[];
  overtime_records: OvertimeRecord[];
  conversations: Conversation[];
  conversation_members: ConversationMember[];
  messages: Message[];
  internal_emails: InternalEmail[];
  file_vault: FileRecord[];
  notifications: Notification[];
  announcements: Announcement[];
  audit_logs: AuditLog[];
  company_settings: CompanySetting[];
}

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_DIR = isVercel
  ? path.resolve('/tmp', 'data')
  : path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DB_DIR, 'opsnexus.db.json');

class DatabaseService {
  private data: DatabaseData = {
    roles: [],
    permissions: [],
    role_permissions: [],
    users: [],
    departments: [],
    employee_profiles: [],
    attendance: [],
    leave_types: [],
    leave_requests: [],
    projects: [],
    project_members: [],
    tasks: [],
    task_comments: [],
    payroll: [],
    overtime_records: [],
    conversations: [],
    conversation_members: [],
    messages: [],
    internal_emails: [],
    file_vault: [],
    notifications: [],
    announcements: [],
    audit_logs: [],
    company_settings: [],
  };

  private isLoaded = false;

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DB_DIR)) {
      try {
        fs.mkdirSync(DB_DIR, { recursive: true });
      } catch (err) {
        console.error('[DB] Failed to create DB directory:', err);
      }
    }

    // In Vercel serverless environments, copy seed database file if tmp storage is empty
    if (isVercel && !fs.existsSync(DB_FILE)) {
      const seedFile = path.resolve(process.cwd(), 'data', 'opsnexus.db.json');
      if (fs.existsSync(seedFile)) {
        try {
          fs.copyFileSync(seedFile, DB_FILE);
          console.log('[DB] Seed data copied to /tmp storage for Vercel execution.');
        } catch (copyErr) {
          console.error('[DB] Failed to copy seed DB file:', copyErr);
        }
      }
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
        this.isLoaded = true;

        // Normalize users to guarantee all authentication and password fields are present
        if (Array.isArray(this.data.users)) {
          for (const u of this.data.users) {
            if (u.must_change_password === undefined) {
              u.must_change_password = Boolean(u.needs_password_change);
            }
            if (u.needs_password_change === undefined) {
              u.needs_password_change = Boolean(u.must_change_password);
            }
            if (u.locked_until === undefined) {
              u.locked_until = u.lockout_until || null;
            }
            if (u.lockout_until === undefined) {
              u.lockout_until = u.locked_until || null;
            }
            if (u.password_changed_at === undefined) {
              u.password_changed_at = null;
            }
            if (u.password_reset_at === undefined) {
              u.password_reset_by = null;
              u.password_reset_at = null;
            }
            if (u.failed_login_attempts === undefined) {
              u.failed_login_attempts = 0;
            }
          }
        }
      } catch (err) {
        console.error('[DB] Failed to read database file, initializing fresh store:', err);
      }
    }

    this.ensureDefaultData();
    this.save();
    this.isLoaded = true;
  }

  private ensureDefaultData() {
    // 1. Roles
    if (!this.data.roles || this.data.roles.length === 0) {
      const now = new Date().toISOString();
      this.data.roles = [
        {
          id: 'role-super-admin',
          name: 'Super Admin',
          description: 'Full system privileges and administrative oversight',
          is_system: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: 'role-admin-hr',
          name: 'Admin / HR Manager',
          description: 'Human resources, attendance, leave, and operational management',
          is_system: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: 'role-project-manager',
          name: 'Project Manager',
          description: 'Project planning, task distribution, and milestone tracking',
          is_system: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: 'role-team-lead',
          name: 'Team Lead',
          description: 'Team coordination, task reviews, and squad guidance',
          is_system: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: 'role-staff',
          name: 'Staff / Employee',
          description: 'Standard team member access for personal tasks and attendance',
          is_system: true,
          created_at: now,
          updated_at: now,
        },
      ];
    }

    // 2. Default Leave Types
    if (!this.data.leave_types || this.data.leave_types.length === 0) {
      const now = new Date().toISOString();
      this.data.leave_types = [
        { id: 'lt-1', name: 'Annual Leave', days_allowed: 14, is_paid: true, description: 'Standard paid annual vacation leave', created_at: now },
        { id: 'lt-2', name: 'Sick Leave', days_allowed: 10, is_paid: true, description: 'Paid medical and sick leave', created_at: now },
        { id: 'lt-3', name: 'Casual Leave', days_allowed: 7, is_paid: true, description: 'Short-notice personal leave', created_at: now },
        { id: 'lt-4', name: 'Unpaid Leave', days_allowed: 30, is_paid: false, description: 'Unpaid absence approved by management', created_at: now },
        { id: 'lt-5', name: 'Maternity/Paternity Leave', days_allowed: 60, is_paid: true, description: 'Parental leave for childbirth and care', created_at: now },
      ];
    }

    // 3. Default Company Settings
    if (!this.data.company_settings || this.data.company_settings.length === 0) {
      const now = new Date().toISOString();
      this.data.company_settings = [
        {
          id: 'setting-company-profile',
          key: 'company_profile',
          value: {
            name: 'OpsNexus Enterprise Technologies',
            legalName: 'OpsNexus Corp Inc.',
            email: 'admin@opsnexus.internal',
            phone: '+1 (555) 019-2834',
            address: '100 Enterprise Way, Suite 400, Tech District, CA',
            timezone: 'America/Los_Angeles',
            workStart: '09:00',
            workEnd: '18:00',
            currency: 'USD',
          },
          updated_at: now,
        },
      ];
    }

    // 4. Default Administrator account (admin / admin with forced password change)
    // IMPORTANT DATABASE RULE:
    // Only create on first installation if no administrator exists.
    // NEVER overwrite or reset an existing admin's password on startup or restart!
    const hasAdmin = this.data.users.some(
      (u) => u.username.toLowerCase() === 'admin' || u.role_id === 'role-super-admin'
    );
    if (!hasAdmin) {
      const now = new Date().toISOString();
      const adminUserId = 'user-admin-root';
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync('admin', salt);

      const adminUser: User = {
        id: adminUserId,
        username: 'admin',
        email: 'admin@opsnexus.internal',
        password_hash: passwordHash,
        role_id: 'role-super-admin',
        status: 'Active',
        must_change_password: true, // REQUIRE FIRST LOGIN PASSWORD CHANGE
        needs_password_change: true,
        password_changed_at: null,
        password_reset_at: null,
        password_reset_by: null,
        failed_login_attempts: 0,
        lockout_until: null,
        locked_until: null,
        last_login_at: null,
        refresh_token_hash: null,
        created_at: now,
        updated_at: now,
      };

      const adminProfile: EmployeeProfile = {
        id: 'profile-admin-root',
        user_id: adminUserId,
        employee_id: 'EMP-001',
        full_name: 'System Administrator',
        position: 'Principal Administrator',
        employment_type: 'Full-Time',
        basic_salary: 0,
        skills: ['System Administration', 'Operations Oversight', 'Executive Leadership'],
        bio: 'Primary system administrator for OpsNexus internal operations platform.',
        created_at: now,
        updated_at: now,
      };

      this.data.users.push(adminUser);
      if (!this.data.employee_profiles) this.data.employee_profiles = [];
      this.data.employee_profiles.push(adminProfile);

      // Audit log entry for system initialization
      if (!this.data.audit_logs) this.data.audit_logs = [];
      this.data.audit_logs.push({
        id: crypto.randomUUID(),
        user_id: adminUserId,
        user_email: 'admin@opsnexus.internal',
        user_role: 'Super Admin',
        action: 'SYSTEM_INSTALL_ADMIN_PROVISIONED',
        entity_type: 'SYSTEM',
        entity_id: adminUserId,
        ip_address: '127.0.0.1',
        metadata: { notice: 'First-time installation completed. Password change required on first login.' },
        created_at: now,
      });

      console.log('[DB] Default administrator account initialized (username: admin, password: admin). First-login password change enforced.');
    }
  }

  public save() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      const serialized = JSON.stringify(this.data, null, 2);
      const tempFile = `${DB_FILE}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
      fs.writeFileSync(tempFile, serialized, 'utf-8');
      fs.renameSync(tempFile, DB_FILE);

      // In development or persistent environments, also mirror to project data/opsnexus.db.json if separate
      const projectSeedFile = path.resolve(process.cwd(), 'data', 'opsnexus.db.json');
      if (DB_FILE !== projectSeedFile && fs.existsSync(path.dirname(projectSeedFile))) {
        try {
          fs.writeFileSync(projectSeedFile, serialized, 'utf-8');
        } catch (_) {}
      }
    } catch (err) {
      console.error('[DB] Failed to save database file:', err);
    }
  }

  // Accessors & Mutators
  public get users() { return this.data.users; }
  public set users(val) { this.data.users = val; }
  public get roles() { return this.data.roles; }
  public set roles(val) { this.data.roles = val; }
  public get permissions() { return this.data.permissions; }
  public set permissions(val) { this.data.permissions = val; }
  public get departments() { return this.data.departments; }
  public set departments(val) { this.data.departments = val; }
  public get employee_profiles() { return this.data.employee_profiles; }
  public set employee_profiles(val) { this.data.employee_profiles = val; }
  public get attendance() { return this.data.attendance; }
  public set attendance(val) { this.data.attendance = val; }
  public get leave_types() { return this.data.leave_types; }
  public set leave_types(val) { this.data.leave_types = val; }
  public get leave_requests() { return this.data.leave_requests; }
  public set leave_requests(val) { this.data.leave_requests = val; }
  public get projects() { return this.data.projects; }
  public set projects(val) { this.data.projects = val; }
  public get project_members() { return this.data.project_members; }
  public set project_members(val) { this.data.project_members = val; }
  public get tasks() { return this.data.tasks; }
  public set tasks(val) { this.data.tasks = val; }
  public get task_comments() { return this.data.task_comments; }
  public set task_comments(val) { this.data.task_comments = val; }
  public get payroll() { return this.data.payroll; }
  public set payroll(val) { this.data.payroll = val; }
  public get overtime_records() { return this.data.overtime_records; }
  public set overtime_records(val) { this.data.overtime_records = val; }
  public get conversations() { return this.data.conversations; }
  public set conversations(val) { this.data.conversations = val; }
  public get conversation_members() { return this.data.conversation_members; }
  public set conversation_members(val) { this.data.conversation_members = val; }
  public get messages() { return this.data.messages; }
  public set messages(val) { this.data.messages = val; }
  public get internal_emails() { return this.data.internal_emails; }
  public set internal_emails(val) { this.data.internal_emails = val; }
  public get file_vault() { return this.data.file_vault; }
  public set file_vault(val) { this.data.file_vault = val; }
  public get notifications() { return this.data.notifications; }
  public set notifications(val) { this.data.notifications = val; }
  public get announcements() { return this.data.announcements; }
  public set announcements(val) { this.data.announcements = val; }
  public get audit_logs() { return this.data.audit_logs; }
  public set audit_logs(val) { this.data.audit_logs = val; }
  public get company_settings() { return this.data.company_settings; }
  public set company_settings(val) { this.data.company_settings = val; }

  // Helper methods
  public getUserWithDetails(userId: string) {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) return null;
    const profile = this.data.employee_profiles.find((p) => p.user_id === userId);
    const role = this.data.roles.find((r) => r.id === user.role_id);
    let departmentName = '';
    if (profile?.department_id) {
      const dept = this.data.departments.find((d) => d.id === profile.department_id);
      if (dept) departmentName = dept.name;
    }
    return {
      ...user,
      profile: profile || null,
      role_name: role ? role.name : 'Unknown Role',
      department_name: departmentName,
    };
  }

  public recalculateProjectProgress(projectId: string) {
    const project = this.data.projects.find((p) => p.id === projectId);
    if (!project) return;
    const projectTasks = this.data.tasks.filter((t) => t.project_id === projectId);
    if (projectTasks.length === 0) {
      project.progress_percentage = 0;
    } else {
      const sum = projectTasks.reduce((acc, t) => acc + (t.progress_percentage || 0), 0);
      project.progress_percentage = Math.round(sum / projectTasks.length);
      const allCompleted = projectTasks.every((t) => t.status === 'Completed');
      if (allCompleted && projectTasks.length > 0) {
        project.status = 'Completed';
      }
    }
    project.updated_at = new Date().toISOString();
    this.save();
  }
}

export const db = new DatabaseService();
