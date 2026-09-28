import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { db } from '../db/db';
import { AuthRequest, logAudit } from '../middleware/auth';
import { config } from '../config';
import { isSupabaseConfigured, getSupabaseClient } from '../config/supabase';

export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    const profileSetting = db.company_settings.find((s) => s.key === 'company_profile');
    const roles = db.roles;
    const leaveTypes = db.leave_types;

    return res.json({
      success: true,
      data: {
        companyProfile: profileSetting ? profileSetting.value : {},
        supabase: {
          isConfigured: isSupabaseConfigured(),
          supabaseUrl: config.supabaseUrl ? `${config.supabaseUrl.slice(0, 16)}...` : 'Not configured',
          hasServiceRoleKey: Boolean(config.supabaseServiceRoleKey),
          hasAnonKey: Boolean(config.supabaseAnonKey),
          mode: isSupabaseConfigured() ? 'Connected to Supabase PostgreSQL' : 'Active Local Persistent Relational Engine',
        },
        roles,
        leaveTypes,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve company settings.' });
  }
};

export const updateCompanyProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, legalName, email, phone, address, timezone, workStart, workEnd, currency } = req.body;

    let setting = db.company_settings.find((s) => s.key === 'company_profile');
    const now = new Date().toISOString();

    if (!setting) {
      setting = {
        id: 'setting-company-profile',
        key: 'company_profile',
        value: {},
        updated_at: now,
      };
      db.company_settings.push(setting);
    }

    setting.value = {
      ...setting.value,
      name: name || setting.value.name,
      legalName: legalName || setting.value.legalName,
      email: email || setting.value.email,
      phone: phone || setting.value.phone,
      address: address || setting.value.address,
      timezone: timezone || setting.value.timezone,
      workStart: workStart || setting.value.workStart,
      workEnd: workEnd || setting.value.workEnd,
      currency: currency || setting.value.currency,
    };
    setting.updated_by = req.user?.id || null;
    setting.updated_at = now;

    db.save();

    logAudit(req, 'SETTINGS_UPDATED', 'COMPANY_SETTINGS', setting.id, { companyName: setting.value.name });

    return res.json({
      success: true,
      message: 'Company profile settings updated successfully.',
      data: setting.value,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update company profile settings.' });
  }
};

export const getSupabaseSql = async (req: AuthRequest, res: Response) => {
  try {
    const schemaPath = path.resolve(process.cwd(), 'database', 'schema.sql');
    const policiesPath = path.resolve(process.cwd(), 'database', 'policies.sql');
    const functionsPath = path.resolve(process.cwd(), 'database', 'functions.sql');

    const schemaSql = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf-8') : '-- schema.sql not found';
    const policiesSql = fs.existsSync(policiesPath) ? fs.readFileSync(policiesPath, 'utf-8') : '-- policies.sql not found';
    const functionsSql = fs.existsSync(functionsPath) ? fs.readFileSync(functionsPath, 'utf-8') : '-- functions.sql not found';

    return res.json({
      success: true,
      data: {
        schemaSql,
        policiesSql,
        functionsSql,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to read database SQL files.' });
  }
};

export const testSupabaseConnection = async (req: AuthRequest, res: Response) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.json({
        success: false,
        connected: false,
        message: 'Supabase credentials are not populated in environment variables (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY). The app is currently operating with the high-performance local persistent store.',
      });
    }

    const client = getSupabaseClient();
    if (!client) {
      return res.json({
        success: false,
        connected: false,
        message: 'Could not initialize Supabase client instance.',
      });
    }

    // Try pinging or querying a lightweight metadata table
    const { error } = await client.from('users').select('count', { count: 'exact', head: true });

    if (error) {
      return res.json({
        success: false,
        connected: false,
        message: `Supabase reached, but table check returned: ${error.message}. Please run the database/schema.sql migration in your Supabase SQL Editor.`,
      });
    }

    return res.json({
      success: true,
      connected: true,
      message: 'Successfully connected and verified against Supabase PostgreSQL database!',
    });
  } catch (err: any) {
    return res.json({
      success: false,
      connected: false,
      message: `Connection error: ${err.message || String(err)}`,
    });
  }
};
