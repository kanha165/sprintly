import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';
import { cleanTasks } from '@/lib/clean';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, guard } from '@/lib/response';
import { notifyChange } from '@/lib/events';

export const POST = guard(async (req: NextRequest) => {
  // Fetch current user (checked by middleware, but we need the user_id for logging)
  const user = await getCurrentUser();

  // 1. Read the raw dirty tasks JSON file from the filesystem
  const tasksJsonPath = path.join(process.cwd(), 'src/data/tasks.json');
  if (!fs.existsSync(tasksJsonPath)) {
    return fail(404, 'tasks.json seed file not found on the server');
  }

  const rawData = JSON.parse(fs.readFileSync(tasksJsonPath, 'utf-8'));

  // 2. Run the pure cleaning engine
  const { cleaned, issuesFixed, tasksLoaded } = cleanTasks(rawData);

  // 3. Wipe current DB contents (comments, activity logs, then tasks)
  // Using .neq('id', ...) is a standard way to match all records for deletion in Supabase Postgrest client
  const { error: deleteCommentsErr } = await supabase
    .from('comments')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  const { error: deleteActivityErr } = await supabase
    .from('activity_log')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  const { error: deleteTasksErr } = await supabase
    .from('tasks')
    .delete()
    .neq('id', '');

  if (deleteCommentsErr || deleteActivityErr || deleteTasksErr) {
    return fail(500, 'Database wipe failed: ' + (deleteTasksErr?.message || deleteCommentsErr?.message || ''));
  }

  // 4. Bulk insert the cleaned tasks into the database
  if (cleaned.length > 0) {
    const { error: insertErr } = await supabase
      .from('tasks')
      .insert(cleaned);

    if (insertErr) {
      return fail(500, 'Failed to insert cleaned tasks: ' + insertErr.message);
    }
  }

  // 5. Log the import action in activity_log
  await supabase
    .from('activity_log')
    .insert({
      user_id: user?.userId || null,
      action: 'imported',
      from_status: null,
      to_status: null,
      task_id: null,
    });

  // 6. Notify SSE listener streams of the update
  notifyChange({ type: 'import', tasksLoaded, issuesFixed });

  // 7. Return success counts
  return ok({ issuesFixed, tasksLoaded });
});
