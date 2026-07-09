import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ok, fail, guard } from '@/lib/response';

export const GET = guard(async (req: NextRequest) => {
  // Fetch names of all registered users
  const { data: users, error } = await supabase
    .from('users')
    .select('name')
    .order('name', { ascending: true });

  if (error) {
    return fail(500, 'Failed to fetch user list: ' + error.message);
  }

  // Extract names into a simple string array
  const names = users.map((u) => u.name);
  return ok(names);
});
