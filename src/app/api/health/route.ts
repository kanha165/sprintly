import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { guard } from '@/lib/response';

/**
 * Health check endpoint to verify Supabase configuration
 */
export const GET = guard(async (req: NextRequest) => {
  const checks = {
    supabaseConfigured: isSupabaseConfigured,
    supabaseUrl: !!process.env.SUPABASE_URL,
    supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: !!process.env.JWT_SECRET,
    databaseConnection: false,
    tablesExist: false,
  };

  // Test database connection if configured
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (!error) {
        checks.databaseConnection = true;
        checks.tablesExist = true;
      }
    } catch (err) {
      console.error('Database health check failed:', err);
    }
  }

  const isHealthy = checks.supabaseConfigured && checks.databaseConnection && checks.tablesExist;

  const message = isHealthy
    ? 'All systems operational'
    : 'Configuration issues detected. Check the setup guide in README.md';

  return NextResponse.json({
    ok: isHealthy,
    status: isHealthy ? 'healthy' : 'unhealthy',
    message,
    checks,
    timestamp: new Date().toISOString(),
  }, { status: isHealthy ? 200 : 503 });
});
