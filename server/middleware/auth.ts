import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { db } from '../db/db';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role_id: string;
  role_name: string;
  status: string;
  needs_password_change: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token missing or invalid format.',
      expired: false,
      invalidToken: true,
    });
  }

  const token = authHeader.substring(7).trim();
  if (!token || token === 'null' || token === 'undefined' || token.length < 10) {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
      expired: false,
      invalidToken: true,
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
        expired: false,
        invalidToken: true,
      });
    }

    const user = db.users.find((u) => u.id === decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found or has been removed.',
        expired: false,
        invalidToken: true,
      });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status.toLowerCase()}. Access denied. Please contact administration.`,
      });
    }

    const role = db.roles.find((r) => r.id === user.role_id);
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role_id: user.role_id,
      role_name: role ? role.name : 'Staff / Employee',
      status: user.status,
      needs_password_change: Boolean(user.needs_password_change),
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has expired. Please refresh your session.',
        expired: true,
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
      expired: false,
      invalidToken: true,
    });
  }
};

export const requireRoles = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // Super Admin has universal access
    if (req.user.role_name === 'Super Admin') {
      return next();
    }

    if (allowedRoles.includes(req.user.role_name)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access forbidden. You do not possess the required permissions for this action.',
    });
  };
};

export const logAudit = (
  req: Request | AuthRequest,
  action: string,
  entity_type: string,
  entity_id?: string,
  metadata?: Record<string, any>
) => {
  const authReq = req as AuthRequest;
  const user = authReq.user;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  const entry = {
    id: crypto.randomUUID(),
    user_id: user ? user.id : null,
    user_email: user ? user.email : 'system / anonymous',
    user_role: user ? user.role_name : 'anonymous',
    action,
    entity_type,
    entity_id: entity_id || undefined,
    ip_address: String(ip),
    user_agent: String(userAgent),
    metadata: metadata || {},
    created_at: new Date().toISOString(),
  };

  db.audit_logs.unshift(entry);
  // Keep audit log to a healthy maximum for performant memory
  if (db.audit_logs.length > 5000) {
    db.audit_logs.pop();
  }
  db.save();
};
