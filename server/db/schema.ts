export interface Role {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string;
  created_at: string;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role_id: string;
  role_name?: string;
  status: 'Active' | 'Inactive' | 'Suspended' | 'Terminated';
  must_change_password: boolean;
  needs_password_change: boolean;
  password_changed_at?: string | null;
  password_reset_at?: string | null;
  password_reset_by?: string | null;
  failed_login_attempts: number;
  lockout_until?: string | null;
  locked_until?: string | null;
  last_login_at?: string | null;
  refresh_token_hash?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  department_head_id?: string | null;
  department_head_name?: string;
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at: string;
  member_count?: number;
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
  department_name?: string;
  position?: string;
  joining_date?: string;
  employment_type: 'Full-Time' | 'Part-Time' | 'Contract' | 'Intern';
  basic_salary: number;
  bank_information?: {
    bank_name?: string;
    account_number?: string;
    routing_number?: string;
    account_holder?: string;
  };
  manager_id?: string | null;
  manager_name?: string;
  skills: string[];
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  employee_name?: string;
  department_name?: string;
  date: string; // YYYY-MM-DD
  check_in_time?: string | null;
  check_out_time?: string | null;
  total_working_hours: number;
  status: 'Present' | 'Late' | 'Half Day' | 'Absent' | 'Leave' | 'Holiday';
  notes?: string;
  corrected_by?: string | null;
  correction_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface LeaveType {
  id: string;
  name: string;
  days_allowed: number;
  is_paid: boolean;
  description?: string;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  employee_name?: string;
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
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
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
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  team_members_count?: number;
  total_tasks_count?: number;
  completed_tasks_count?: number;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  role_in_project?: string;
  assigned_at: string;
}

export interface Task {
  id: string;
  task_code: string;
  project_id: string;
  project_name?: string;
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
  submitted_at?: string | null;
  reviewed_by?: string | null;
  review_feedback?: string;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  comment: string;
  attachment_url?: string;
  created_at: string;
}

export interface Payroll {
  id: string;
  user_id: string;
  employee_name?: string;
  employee_id_code?: string;
  department_name?: string;
  month_year: string; // YYYY-MM
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
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OvertimeRecord {
  id: string;
  user_id: string;
  employee_name?: string;
  date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  hourly_rate: number;
  total_amount: number;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'project' | 'department';
  title?: string;
  project_id?: string | null;
  department_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  last_message?: string;
  last_message_at?: string;
  members?: ConversationMember[];
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  user_name?: string;
  joined_at: string;
  last_read_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'pdf' | 'document' | 'file' | 'link';
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
  is_deleted: boolean;
  reply_to_id?: string | null;
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
  is_archived_by_sender: boolean;
  is_archived_by_recipient: boolean;
  is_deleted_by_sender: boolean;
  is_deleted_by_recipient: boolean;
  created_at: string;
}

export interface FileRecord {
  id: string;
  file_name: string;
  original_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  category: 'Employee documents' | 'Project documents' | 'Task attachments' | 'Payroll documents' | 'Company documents' | 'Chat files';
  uploaded_by: string;
  uploaded_by_name?: string;
  related_project_id?: string | null;
  related_task_id?: string | null;
  access_level: 'Public' | 'Company' | 'Department' | 'Project' | 'Private';
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description?: string;
  entity_type?: string;
  entity_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  publish_date: string;
  expiry_date?: string | null;
  audience: 'Everyone' | 'Department' | 'Specific Team' | 'Admins Only';
  department_id?: string | null;
  department_name?: string;
  attachment_url?: string;
  created_by?: string | null;
  created_by_name?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  user_email?: string;
  user_role?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface CompanySetting {
  id: string;
  key: string;
  value: any;
  updated_by?: string | null;
  updated_at: string;
}
