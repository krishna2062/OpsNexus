export interface Role {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role_id: string;
  role_name: string;
  status: 'Active' | 'Inactive' | 'Suspended' | 'Terminated';
  must_change_password?: boolean;
  needs_password_change: boolean;
  password_changed_at?: string | null;
  password_reset_at?: string | null;
  password_reset_by?: string | null;
  last_login_at?: string | null;
  created_at: string;
  profile?: EmployeeProfile | null;
  department_name?: string;
  manager?: {
    id: string;
    name: string;
  } | null;
}

export interface EmployeeProfile {
  id: string;
  user_id: string;
  employee_id: string;
  full_name: string;
  profile_picture_url?: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  gender?: string;
  emergency_contact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  department_id?: string | null;
  position?: string;
  joining_date?: string;
  employment_type: 'Full-Time' | 'Part-Time' | 'Contract' | 'Intern';
  basic_salary?: number;
  bank_information?: {
    bank_name?: string;
    account_number?: string;
    routing_number?: string;
    account_holder?: string;
  };
  manager_id?: string | null;
  skills: string[];
  bio?: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  department_head_id?: string | null;
  department_head_name?: string;
  status: 'Active' | 'Inactive';
  member_count?: number;
  created_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  employee_name?: string;
  employee_id_code?: string;
  department_name?: string;
  date: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  total_working_hours: number;
  status: 'Present' | 'Late' | 'Half Day' | 'Absent' | 'Leave' | 'Holiday';
  notes?: string;
  correction_reason?: string;
}

export interface LeaveType {
  id: string;
  name: string;
  days_allowed: number;
  is_paid: boolean;
  description?: string;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  employee_name?: string;
  employee_id_code?: string;
  department_name?: string;
  leave_type_id: string;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  number_of_days: number;
  reason: string;
  attachment_url?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  reviewed_by?: string | null;
  reviewed_by_name?: string;
  review_remarks?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface Project {
  id: string;
  project_code: string;
  name: string;
  description?: string;
  client?: string;
  start_date?: string;
  deadline?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  budget: number;
  project_manager_id?: string | null;
  project_manager_name?: string;
  status: 'Planning' | 'Pending' | 'In Progress' | 'On Hold' | 'Review' | 'Completed' | 'Cancelled';
  progress_percentage: number;
  team_members_count?: number;
  total_tasks_count?: number;
  completed_tasks_count?: number;
  created_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  position?: string;
  role_in_project?: string;
  profile_picture_url?: string;
  assigned_at: string;
}

export interface Task {
  id: string;
  task_code: string;
  project_id: string;
  project_name?: string;
  project_code?: string;
  title: string;
  description?: string;
  assigned_to?: string | null;
  assigned_to_name?: string;
  assigned_by?: string | null;
  assigned_by_name?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  deadline?: string;
  estimated_hours: number;
  actual_hours: number;
  progress_percentage: number;
  status: 'Pending' | 'Accepted' | 'In Progress' | 'Blocked' | 'Submitted for Review' | 'Revision Required' | 'Completed' | 'Cancelled';
  submission_notes?: string;
  submission_attachment_url?: string;
  submitted_at?: string;
  reviewed_by?: string;
  review_feedback?: string;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  comment: string;
  created_at: string;
}

export interface Payroll {
  id: string;
  user_id: string;
  employee_name?: string;
  employee_id_code?: string;
  department_name?: string;
  month_year: string;
  basic_salary: number;
  allowances: number;
  bonus: number;
  overtime_pay: number;
  deductions: number;
  tax: number;
  net_salary: number;
  payment_date?: string;
  payment_status: 'Pending' | 'Processed' | 'Paid';
  notes?: string;
  created_at: string;
}

export interface OvertimeRecord {
  id: string;
  user_id: string;
  employee_name?: string;
  employee_id_code?: string;
  date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  hourly_rate: number;
  total_amount: number;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'project' | 'department';
  title?: string;
  last_message?: string;
  last_message_at?: string;
  members?: Array<{
    id: string;
    user_id: string;
    user_name: string;
    profile_picture_url?: string;
  }>;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  sender_profile_picture?: string;
  content: string;
  message_type: string;
  attachment_url?: string;
  attachment_name?: string;
  created_at: string;
}

export interface InternalEmail {
  id: string;
  sender_id: string;
  sender_name?: string;
  sender_email?: string;
  recipient_id: string;
  recipient_name?: string;
  recipient_email?: string;
  subject: string;
  body: string;
  attachment_url?: string;
  attachment_name?: string;
  is_read: boolean;
  is_draft: boolean;
  created_at: string;
}

export interface FileRecord {
  id: string;
  file_name: string;
  original_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  category: string;
  uploaded_by: string;
  uploaded_by_name?: string;
  project_name?: string;
  access_level: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description?: string;
  is_read: boolean;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  publish_date: string;
  audience: string;
  department_name?: string;
  created_by_name?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  user_role?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  ip_address?: string;
  metadata?: any;
  created_at: string;
}

export interface DashboardStats {
  summary: {
    totalEmployees: number;
    activeEmployees: number;
    presentToday: number;
    absentToday: number;
    onLeaveToday: number;
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    pendingProjects: number;
    overdueProjects: number;
    totalTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    completedTasks: number;
    overdueTasks: number;
    pendingLeaveRequests: number;
    monthlyPayroll: number;
    monthlyOvertimeHours: number;
    monthlyOvertimeCost: number;
  };
  charts: {
    projectStatusDistribution: Array<{ name: string; count: number }>;
    taskStatusDistribution: Array<{ name: string; count: number }>;
  };
  recentActivities: AuditLog[];
}
