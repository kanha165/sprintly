import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';
import { cleanTasks } from '@/lib/clean';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, guard } from '@/lib/response';
import { notifyChange } from '@/lib/events';

export const POST = guard(async (req: NextRequest) => {
  // 1. Authenticate user
  const user = await getCurrentUser();
  if (!user) return fail(401, 'Unauthorized');

  // 2. Read the raw dirty tasks JSON file from the filesystem
  const tasksJsonPath = path.join(process.cwd(), 'src/data/tasks.json');
  if (!fs.existsSync(tasksJsonPath)) {
    return fail(404, 'tasks.json seed file not found on the server');
  }

  const rawData = JSON.parse(fs.readFileSync(tasksJsonPath, 'utf-8'));

  // 3. Run the cleaning engine
  const { cleaned, issuesFixed, tasksLoaded } = cleanTasks(rawData);

  // 4. Wipe DB contents (comments, activity logs, tasks)
  await supabase.from('comments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('activity_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('tasks').delete().neq('id', '');

  // 5. Bulk insert the cleaned tasks into the database
  if (cleaned.length > 0) {
    const { error: insertErr } = await supabase
      .from('tasks')
      .insert(cleaned);

    if (insertErr) {
      return fail(500, 'Failed to insert cleaned tasks: ' + insertErr.message);
    }
  }

  // 6. Log the reset action in activity_log
  await supabase
    .from('activity_log')
    .insert({
      user_id: user.userId,
      action: 'reset',
      from_status: null,
      to_status: null,
      task_id: null,
    });

  // 7. Load all fresh tasks to return
  const { data: freshTasks, error: loadErr } = await supabase
    .from('tasks')
    .select('*')
    .order('position', { ascending: true });

  if (loadErr) {
    return fail(500, 'Failed to retrieve refreshed tasks');
  }

  // 8. Notify SSE client streams of board reset
  notifyChange({ type: 'reset', tasks: freshTasks, tasksLoaded, issuesFixed });

  // 9. Return counts and refreshed tasks list
  return ok({
    tasks: freshTasks,
    issuesFixed,
    tasksLoaded,
  });
});
