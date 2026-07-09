import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ok, fail, guard } from '@/lib/response';

export const GET = guard(async (req: NextRequest) => {
  // Fetch activity log entries joined with user details and task titles
  const { data: activities, error } = await supabase
    .from('activity_log')
    .select('*, user:users(name), task:tasks(title)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return fail(500, 'Failed to fetch activity logs: ' + error.message);
  }

  return ok(activities);
});
