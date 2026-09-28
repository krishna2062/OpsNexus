import { Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db/db';
import { AuthRequest, logAudit } from '../middleware/auth';
import { User, EmployeeProfile } from '../db/schema';

export const getEmployees = async (req: AuthRequest, res: Response) => {
  try {
    const { department_id, status, role_id, search } = req.query;
    const isUserAdmin = req.user?.role_name === 'Super Admin' || req.user?.role_name === 'Admin / HR Manager';

    let users = [...db.users];

    // Status filter
    if (status) {
      users = users.filter((u) => u.status === status);
    }

    // Role filter
    if (role_id) {
      users = users.filter((u) => u.role_id === role_id);
    }

    // Map profiles and departments
    let results = users.map((u) => {
      const profile = db.employee_profiles.find((p) => p.user_id === u.id);
      const role = db.roles.find((r) => r.id === u.role_id);
      let department = null;
      if (profile?.department_id) {
        department = db.departments.find((d) => d.id === profile.department_id);
      }
      let manager = null;
      if (profile?.manager_id) {
        const mgrUser = db.users.find((m) => m.id === profile.manager_id);
        const mgrProfile = db.employee_profiles.find((p) => p.user_id === profile.manager_id);
        if (mgrUser) {
          manager = {
            id: mgrUser.id,
            name: mgrProfile?.full_name || mgrUser.username,
          };
        }
      }

      // Security check: Only Admins or self can see salary & bank info
      const canViewSensitive = isUserAdmin || req.user?.id === u.id;

      return {
        id: u.id,
        username: u.username,
        email: u.email,
        role_id: u.role_id,
        role_name: role?.name || 'Staff / Employee',
        status: u.status,
        last_login_at: u.last_login_at,
        created_at: u.created_at,
        profile: profile
          ? {
              ...profile,
              basic_salary: canViewSensitive ? profile.basic_salary : undefined,
              bank_information: canViewSensitive ? profile.bank_information : undefined,
            }
          : null,
        department_name: department?.name || '',
        manager,
      };
    });

    // Department filter
    if (department_id) {
      results = results.filter((r) => r.profile?.department_id === department_id);
    }

    // Search query filter
    if (search) {
      const q = String(search).toLowerCase();
      results = results.filter(
        (r) =>
          r.username.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.profile?.full_name && r.profile.full_name.toLowerCase().includes(q)) ||
          (r.profile?.employee_id && r.profile.employee_id.toLowerCase().includes(q)) ||
          (r.profile?.position && r.profile.position.toLowerCase().includes(q))
      );
    }

    return res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (err: any) {
    console.error('[Get Employees Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve employees list.' });
  }
};

export const getEmployeeById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isUserAdmin = req.user?.role_name === 'Super Admin' || req.user?.role_name === 'Admin / HR Manager';
    const isSelf = req.user?.id === id;

    const user = db.users.find((u) => u.id === id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const profile = db.employee_profiles.find((p) => p.user_id === id);
    const role = db.roles.find((r) => r.id === user.role_id);
    const department = profile?.department_id ? db.departments.find((d) => d.id === profile.department_id) : null;
    const manager = profile?.manager_id ? db.users.find((m) => m.id === profile.manager_id) : null;
    const managerProfile = manager ? db.employee_profiles.find((p) => p.user_id === manager.id) : null;

    // Calculate real database performance metrics
    const userTasks = db.tasks.filter((t) => t.assigned_to === id);
    const completedTasks = userTasks.filter((t) => t.status === 'Completed').length;
    const inProgressTasks = userTasks.filter((t) => t.status === 'In Progress' || t.status === 'Accepted').length;
    const pendingTasks = userTasks.filter((t) => t.status === 'Pending').length;

    const assignedProjects = db.projects.filter((p) => {
      const isManager = p.project_manager_id === id;
      const isMember = db.project_members.some((pm) => pm.project_id === p.id && pm.user_id === id);
      return isManager || isMember;
    });

    // Attendance summary
    const userAttendance = db.attendance.filter((a) => a.user_id === id);
    const presentDays = userAttendance.filter((a) => a.status === 'Present' || a.status === 'Late').length;
    const totalHoursWorked = userAttendance.reduce((acc, a) => acc + (a.total_working_hours || 0), 0);

    // Leaves summary
    const userLeaves = db.leave_requests.filter((l) => l.user_id === id);
    const approvedLeaves = userLeaves.filter((l) => l.status === 'Approved');

    const canViewSensitive = isUserAdmin || isSelf;

    return res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
        role_name: role?.name || 'Staff / Employee',
        status: user.status,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        profile: profile
          ? {
              ...profile,
              basic_salary: canViewSensitive ? profile.basic_salary : undefined,
              bank_information: canViewSensitive ? profile.bank_information : undefined,
            }
          : null,
        department: department
          ? { id: department.id, name: department.name, description: department.description }
          : null,
        manager: manager
          ? { id: manager.id, name: managerProfile?.full_name || manager.username }
          : null,
        stats: {
          totalAssignedTasks: userTasks.length,
          completedTasks,
          inProgressTasks,
          pendingTasks,
          taskCompletionRate: userTasks.length > 0 ? Math.round((completedTasks / userTasks.length) * 100) : 0,
          totalAssignedProjects: assignedProjects.length,
          daysPresent: presentDays,
          totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
          totalLeaveDaysTaken: approvedLeaves.reduce((acc, l) => acc + (l.number_of_days || 0), 0),
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve employee details.' });
  }
};

export const createEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const {
      username,
      email,
      password,
      role_id,
      full_name,
      employee_id,
      department_id,
      position,
      phone,
      address,
      date_of_birth,
      gender,
      joining_date,
      employment_type,
      basic_salary,
      bank_information,
      emergency_contact,
      manager_id,
      skills,
      bio,
      profile_picture_url,
    } = req.body;

    // Required fields check
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, password, and full name are required.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Temporary password must be at least 8 characters long.',
      });
    }

    // Check duplicate username or email
    const cleanUsername = String(username).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    if (db.users.some((u) => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Username '${cleanUsername}' is already taken. Please choose another.`,
      });
    }

    if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: `Email '${cleanEmail}' is already registered with an existing account.`,
      });
    }

    // Generate unique employee ID if not provided
    let empCode = employee_id ? String(employee_id).trim() : '';
    if (!empCode) {
      const count = db.employee_profiles.length + 1;
      empCode = `EMP-${String(count).padStart(3, '0')}`;
    } else {
      if (db.employee_profiles.some((p) => p.employee_id.toLowerCase() === empCode.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Employee ID '${empCode}' is already in use.`,
        });
      }
    }

    // Validate role
    let assignedRoleId = role_id;
    if (!assignedRoleId) {
      const staffRole = db.roles.find((r) => r.name === 'Staff / Employee');
      assignedRoleId = staffRole ? staffRole.id : db.roles[0].id;
    }

    const now = new Date().toISOString();
    const newUserId = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync(password, 10);

    const newUser: User = {
      id: newUserId,
      username: cleanUsername,
      email: cleanEmail,
      password_hash: passwordHash,
      role_id: assignedRoleId,
      status: 'Active',
      must_change_password: true, // Forces employee to set personal password on first login
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

    const newProfile: EmployeeProfile = {
      id: crypto.randomUUID(),
      user_id: newUserId,
      employee_id: empCode,
      full_name: String(full_name).trim(),
      profile_picture_url: profile_picture_url || '',
      phone: phone || '',
      address: address || '',
      date_of_birth: date_of_birth || '',
      gender: gender || 'Unspecified',
      emergency_contact: emergency_contact || {},
      department_id: department_id || null,
      position: position || 'Team Member',
      joining_date: joining_date || now.split('T')[0],
      employment_type: employment_type || 'Full-Time',
      basic_salary: Number(basic_salary) || 0,
      bank_information: bank_information || {},
      manager_id: manager_id || null,
      skills: Array.isArray(skills) ? skills : typeof skills === 'string' ? skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
      bio: bio || '',
      created_at: now,
      updated_at: now,
    };

    db.users.push(newUser);
    db.employee_profiles.push(newProfile);
    db.save();

    // Create system notification for new user
    db.notifications.push({
      id: crypto.randomUUID(),
      user_id: newUserId,
      type: 'ACCOUNT_CREATED',
      title: 'Welcome to OpsNexus!',
      description: 'Your employee profile has been created. Please complete your security profile and change your temporary password.',
      entity_type: 'USER',
      entity_id: newUserId,
      is_read: false,
      created_at: now,
    });
    db.save();

    logAudit(req, 'EMPLOYEE_CREATED', 'USER', newUserId, {
      username: cleanUsername,
      email: cleanEmail,
      employee_id: empCode,
    });

    return res.status(201).json({
      success: true,
      message: `Employee account '${cleanUsername}' (${empCode}) created successfully.`,
      data: {
        userId: newUserId,
        employee_id: empCode,
        username: cleanUsername,
      },
    });
  } catch (err: any) {
    console.error('[Create Employee Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to create employee account.' });
  }
};

export const updateEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isUserAdmin = req.user?.role_name === 'Super Admin' || req.user?.role_name === 'Admin / HR Manager';
    const isSelf = req.user?.id === id;

    if (!isUserAdmin && !isSelf) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this profile.' });
    }

    const user = db.users.find((u) => u.id === id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    let profile = db.employee_profiles.find((p) => p.user_id === id);
    if (!profile) {
      profile = {
        id: crypto.randomUUID(),
        user_id: id,
        employee_id: `EMP-${String(db.employee_profiles.length + 1).padStart(3, '0')}`,
        full_name: user.username,
        employment_type: 'Full-Time',
        basic_salary: 0,
        skills: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.employee_profiles.push(profile);
    }

    const {
      full_name,
      phone,
      address,
      date_of_birth,
      gender,
      emergency_contact,
      department_id,
      position,
      role_id,
      joining_date,
      employment_type,
      basic_salary,
      bank_information,
      manager_id,
      skills,
      bio,
      profile_picture_url,
    } = req.body;

    const now = new Date().toISOString();

    // Fields employee can update on themselves
    if (full_name) profile.full_name = String(full_name).trim();
    if (phone !== undefined) profile.phone = phone;
    if (address !== undefined) profile.address = address;
    if (date_of_birth !== undefined) profile.date_of_birth = date_of_birth;
    if (gender !== undefined) profile.gender = gender;
    if (emergency_contact !== undefined) profile.emergency_contact = emergency_contact;
    if (skills !== undefined) {
      profile.skills = Array.isArray(skills) ? skills : typeof skills === 'string' ? skills.split(',').map((s) => s.trim()).filter(Boolean) : [];
    }
    if (bio !== undefined) profile.bio = bio;
    if (profile_picture_url !== undefined) profile.profile_picture_url = profile_picture_url;

    // Fields only Admin can update
    if (isUserAdmin) {
      if (department_id !== undefined) profile.department_id = department_id;
      if (position !== undefined) profile.position = position;
      if (joining_date !== undefined) profile.joining_date = joining_date;
      if (employment_type !== undefined) profile.employment_type = employment_type;
      if (basic_salary !== undefined) profile.basic_salary = Number(basic_salary) || 0;
      if (bank_information !== undefined) profile.bank_information = bank_information;
      if (manager_id !== undefined) profile.manager_id = manager_id;
      if (role_id && role_id !== user.role_id) {
        user.role_id = role_id;
        user.updated_at = now;
      }
    }

    profile.updated_at = now;
    user.updated_at = now;
    db.save();

    logAudit(req, 'EMPLOYEE_UPDATED', 'USER', id, { updatedBy: req.user?.username });

    return res.json({
      success: true,
      message: 'Employee profile updated successfully.',
      data: profile,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update employee profile.' });
  }
};

export const updateEmployeeStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Active', 'Inactive', 'Suspended', 'Terminated'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const user = db.users.find((u) => u.id === id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    // Prevent deactivating own account if super admin
    if (user.id === req.user?.id && status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: 'Security protection: You cannot alter your own administrative active status.',
      });
    }

    user.status = status;
    user.updated_at = new Date().toISOString();
    db.save();

    logAudit(req, 'EMPLOYEE_STATUS_CHANGED', 'USER', id, { newStatus: status });

    return res.json({
      success: true,
      message: `Employee account status updated to ${status}.`,
      data: { id: user.id, status: user.status },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update account status.' });
  }
};

export const resetEmployeePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New temporary password must be at least 8 characters long.',
      });
    }

    const user = db.users.find((u) => u.id === id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const targetRole = db.roles.find((r) => r.id === user.role_id);
    const isTargetAdmin =
      targetRole?.name === 'Super Admin' ||
      targetRole?.name === 'Admin / HR Manager' ||
      user.role_id === 'role-super-admin';
    const isRequesterSuperAdmin =
      req.user?.role_name === 'Super Admin' || req.user?.role_id === 'role-super-admin';

    // Requirement 9: Only Super Admin or authorized administrator should be allowed to reset another administrator's password.
    if (isTargetAdmin && !isRequesterSuperAdmin) {
      logAudit(req, 'UNAUTHORIZED_ADMIN_PASSWORD_RESET_ATTEMPT', 'USER', id, {
        attemptedBy: req.user?.username,
        targetUsername: user.username,
      });
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only Super Administrators can reset administrative account passwords.',
      });
    }

    const now = new Date().toISOString();
    user.password_hash = bcrypt.hashSync(newPassword, 10);
    user.must_change_password = true; // Enforces password change on next login
    user.needs_password_change = true;
    user.password_reset_at = now;
    user.password_reset_by = req.user?.username || req.user?.id || 'admin';
    user.failed_login_attempts = 0;
    user.lockout_until = null;
    user.locked_until = null;
    user.updated_at = now;
    db.save();

    // Requirement 9: Audit log without exposing password
    logAudit(req, 'EMPLOYEE_PASSWORD_RESET', 'USER', id, {
      performedBy: req.user?.username,
      performedByUserId: req.user?.id,
      targetUsername: user.username,
      targetEmail: user.email,
      targetRole: targetRole?.name || user.role_id,
      timestamp: now,
    });

    return res.json({
      success: true,
      message: `Password reset successfully for user '${user.username}'. They will be prompted to change it upon next login.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to reset employee password.' });
  }
};
