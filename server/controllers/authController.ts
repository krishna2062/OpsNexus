import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/db';
import { config } from '../config';
import { AuthRequest, logAudit } from '../middleware/auth';

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.',
      });
    }

    const cleanUsername = String(username).trim();
    // Allow login by username OR email
    const user = db.users.find(
      (u) => u.username.toLowerCase() === cleanUsername.toLowerCase() || u.email.toLowerCase() === cleanUsername.toLowerCase()
    );

    if (!user) {
      logAudit(req, 'LOGIN_FAILED', 'USER', undefined, { username: cleanUsername, reason: 'User not found' });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials provided.',
      });
    }

    // Check account lockout
    if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
      const waitMinutes = Math.ceil((new Date(user.lockout_until).getTime() - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked due to excessive failed attempts. Please retry in ${waitMinutes} minutes.`,
      });
    }

    // Check status
    if (user.status !== 'Active') {
      logAudit(req, 'LOGIN_BLOCKED', 'USER', user.id, { status: user.status });
      return res.status(403).json({
        success: false,
        message: `Your account status is ${user.status}. Access is prohibited. Please contact your company administrator.`,
      });
    }

    // Verify password
    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;
      if (user.failed_login_attempts >= config.maxLoginAttempts) {
        user.lockout_until = new Date(Date.now() + config.lockoutDurationMinutes * 60000).toISOString();
        logAudit(req, 'ACCOUNT_LOCKED_OUT', 'USER', user.id, { attempts: user.failed_login_attempts });
      }
      db.save();
      logAudit(req, 'LOGIN_FAILED', 'USER', user.id, { reason: 'Incorrect password' });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials provided.',
        attemptsLeft: Math.max(0, config.maxLoginAttempts - user.failed_login_attempts),
      });
    }

    // Reset failed login attempts on success
    user.failed_login_attempts = 0;
    user.lockout_until = null;
    user.last_login_at = new Date().toISOString();

    const role = db.roles.find((r) => r.id === user.role_id);
    const roleName = role ? role.name : 'Staff / Employee';

    // Generate JWT access token & refresh token
    const tokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role_id: user.role_id,
      role_name: roleName,
    };

    const accessToken = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '8h' });
    const refreshToken = jwt.sign({ id: user.id }, config.jwtRefreshSecret, { expiresIn: '7d' });

    user.refresh_token_hash = bcrypt.hashSync(refreshToken, 8);
    db.save();

    const profile = db.employee_profiles.find((p) => p.user_id === user.id);
    const mustChange = Boolean(user.must_change_password ?? user.needs_password_change);

    logAudit(req, 'LOGIN_SUCCESS', 'USER', user.id, { role: roleName });

    return res.json({
      success: true,
      message: 'Authentication successful.',
      data: {
        accessToken,
        refreshToken,
        must_change_password: mustChange,
        needs_password_change: mustChange,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role_id: user.role_id,
          role_name: roleName,
          status: user.status,
          must_change_password: mustChange,
          needs_password_change: mustChange,
          password_changed_at: user.password_changed_at || null,
          last_login_at: user.last_login_at,
          profile: profile || null,
        },
      },
    });
  } catch (err: any) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({ success: false, message: 'Internal server authentication error.' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Refresh token is required.' });
    }

    const decoded = jwt.verify(token, config.jwtRefreshSecret) as any;
    const user = db.users.find((u) => u.id === decoded.id);

    if (!user || !user.refresh_token_hash || user.status !== 'Active') {
      return res.status(401).json({ success: false, message: 'Invalid or revoked refresh token.' });
    }

    const isMatch = bcrypt.compareSync(token, user.refresh_token_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const role = db.roles.find((r) => r.id === user.role_id);
    const roleName = role ? role.name : 'Staff / Employee';

    const newAccessToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
        role_name: roleName,
      },
      config.jwtSecret,
      { expiresIn: '8h' }
    );

    return res.json({
      success: true,
      data: { accessToken: newAccessToken },
    });
  } catch (err: any) {
    return res.status(401).json({ success: false, message: 'Expired or invalid refresh token.' });
  }
};

export const firstLoginPasswordChange = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // If current password provided, verify against existing hash
    if (currentPassword) {
      const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Incorrect current password provided.',
        });
      }
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must contain at least 8 characters.',
      });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and password confirmation do not match.',
      });
    }

    if (newPassword.toLowerCase() === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Security policy: You cannot reuse the default password.',
      });
    }

    // Update password hash and clear mandatory password change flags
    const now = new Date().toISOString();
    user.password_hash = bcrypt.hashSync(newPassword, 10);
    user.must_change_password = false;
    user.needs_password_change = false;
    user.password_changed_at = now;
    user.failed_login_attempts = 0;
    user.lockout_until = null;
    user.locked_until = null;
    user.updated_at = now;

    const role = db.roles.find((r) => r.id === user.role_id);
    const roleName = role ? role.name : 'Staff / Employee';

    const accessToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
        role_name: roleName,
      },
      config.jwtSecret,
      { expiresIn: '8h' }
    );
    const refreshToken = jwt.sign({ id: user.id }, config.jwtRefreshSecret, { expiresIn: '7d' });
    user.refresh_token_hash = bcrypt.hashSync(refreshToken, 8);
    db.save();

    logAudit(req, 'FIRST_LOGIN_PASSWORD_CHANGED', 'USER', user.id, {
      username: user.username,
      notice: 'User changed initial temporary credentials; must_change_password set to false',
    });

    return res.json({
      success: true,
      message: 'Password successfully updated. You now have full access to OpsNexus.',
      data: {
        accessToken,
        refreshToken,
        must_change_password: false,
        needs_password_change: false,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role_id: user.role_id,
          role_name: roleName,
          status: user.status,
          must_change_password: false,
          needs_password_change: false,
          password_changed_at: user.password_changed_at,
        },
      },
    });
  } catch (err: any) {
    console.error('[First Login Password Change Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to update initial password.' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is required.',
      });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.',
      });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and password confirmation do not match.',
      });
    }

    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password provided.',
      });
    }

    const now = new Date().toISOString();
    user.password_hash = bcrypt.hashSync(newPassword, 10);
    user.must_change_password = false;
    user.needs_password_change = false;
    user.password_changed_at = now;
    user.updated_at = now;
    db.save();

    logAudit(req, 'PASSWORD_CHANGED', 'USER', user.id, {
      username: user.username,
      notice: 'User voluntary password change completed.',
    });

    return res.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.id) {
      const user = db.users.find((u) => u.id === req.user?.id);
      if (user) {
        user.refresh_token_hash = null;
        db.save();
      }
      logAudit(req, 'LOGOUT', 'USER', req.user.id);
    }
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to logout.' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }
    const user = db.getUserWithDetails(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User record not found.' });
    }

    const { password_hash, refresh_token_hash, ...safeUser } = user as any;
    const mustChange = Boolean(safeUser.must_change_password ?? safeUser.needs_password_change);

    return res.json({
      success: true,
      data: {
        ...safeUser,
        must_change_password: mustChange,
        needs_password_change: mustChange,
        password_changed_at: safeUser.password_changed_at || null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch current user profile.' });
  }
};
