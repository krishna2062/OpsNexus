import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'opsnexus_enterprise_super_secret_jwt_key_2026_x79',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'opsnexus_enterprise_refresh_token_secret_key_2026_x82',
  jwtExpiresIn: '8h',
  jwtRefreshExpiresIn: '7d',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  databaseUrl: process.env.DATABASE_URL || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 15,
};
