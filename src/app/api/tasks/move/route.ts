import { NextRequest } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, guard } from '@/lib/response';
import { notifyChange } from '@/lib/events';
import { Task, TaskStatus } from '@/lib/types';

const moveTaskSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  toStatus: z.enum(['Backlog', 'In Progress', 'Review', 'Done']),
  position: z.number().nonnegative(),
});

export const PATCH = guard(async (req: NextRequest) => {
  // 1. Authenticate user
  const currentUser = await getCurrentUser();
  if (!currentUser) return fail(401, 'Unauthorized');

  const body = await req.json();
  const validation = moveTaskSchema.safeParse(body);
  if (!validation.success) {
    return fail(400, validation.error.issues[0].message);
  }

  const { taskId, toStatus, position: targetPosition } = validation.data;

  // 2. Fetch original task to check its current column/status
  const { data: task, error: fetchErr } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .maybeSingle();

  if (fetchErr || !task) {
    return fail(404, 'Task not found');
  }

  const fromStatus = task.status as TaskStatus;

  // 3. Enforce member Done column locks
  const isMember = currentUser.role === 'member';
  if (isMember) {
    if (fromStatus === 'Done' || toStatus === 'Done') {
      return fail(403, 'Forbidden. Done column is locked for member roles.');
    }
  }

  // 4. Enforce server-side WIP limits — only when moving INTO a different column.
  //    Exclude the task being moved itself from the count (it already occupies a
  //    slot in its current column, so a same-column reorder must never be blocked).
  if (fromStatus !== toStatus) {
    if (toStatus === 'In Progress') {
      const { count, error: countErr } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'In Progress')
        .neq('id', taskId);

      if (countErr) return fail(500, 'WIP limit check failed');
      if ((count ?? 0) >= 8) {
        return fail(409, 'WIP Limit Exceeded: In Progress column is full (max 8)');
      }
    }

    if (toStatus === 'Review') {
      const { count, error: countErr } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Review')
        .neq('id', taskId);

      if (countErr) return fail(500, 'WIP limit check failed');
      if ((count ?? 0) >= 6) {
        return fail(409, 'WIP Limit Exceeded: Review column is full (max 6)');
      }
    }
  }

  // 5. Fetch all tasks from the DB to compute the new reordered state
  const { data: allTasks, error: loadErr } = await supabase
    .from('tasks')
    .select('*')
    .order('position', { ascending: true });

  if (loadErr || !allTasks) {
    return fail(500, 'Failed to fetch tasks for reordering');
  }

  const typedTasks = allTasks as Task[];

  // 6. Partition tasks into source, target, and remaining
  const remainingTasks = typedTasks.filter(t => t.id !== taskId);
  
  const sourceCol = remainingTasks.filter(t => t.status === fromStatus);
  const destCol = fromStatus === toStatus ? sourceCol : remainingTasks.filter(t => t.status === toStatus);

  // Set new status and completion date for moved task
  const updatedTask = { ...task };
  updatedTask.status = toStatus;
  
  if (toStatus === 'Done') {
    updatedTask.completed_date = task.completed_date || new Date().toISOString();
  } else {
    updatedTask.completed_date = null;
  }

  // Insert into target position
  destCol.splice(targetPosition, 0, updatedTask);

  // Re-index position indices in affected columns
  sourceCol.forEach((t, index) => {
    t.position = index;
  });
  destCol.forEach((t, index) => {
    t.position = index;
  });

  // Prepare database updates — must include ALL non-nullable columns because
  // Supabase upsert inserts a new row if id is not found, and NOT NULL columns
  // like title would fail. We merge updated position/status onto the full task object.
  const allTasksById = new Map(typedTasks.map(t => [t.id, t]));
  // Also include the moved task itself (already updated above)
  allTasksById.set(updatedTask.id, updatedTask);

  const updates: Task[] = [];

  if (fromStatus !== toStatus) {
    sourceCol.forEach(t => {
      const full = allTasksById.get(t.id);
      if (full) updates.push({ ...full, position: t.position });
    });
  }

  destCol.forEach(t => {
    const full = allTasksById.get(t.id);
    if (full) updates.push({ ...full, position: t.position, status: toStatus });
  });

  const { error: upsertErr } = await supabase
    .from('tasks')
    .upsert(updates as Task[], { onConflict: 'id' });

  if (upsertErr) {
    return fail(500, 'Database position updates failed: ' + upsertErr.message);
  }

  // 7. Write activity logs
  let actionText = 'moved';
  if (fromStatus === toStatus) {
    actionText = 'reordered';
  } else if (toStatus === 'Done') {
    actionText = 'completed';
  }

  await supabase
    .from('activity_log')
    .insert({
      user_id: currentUser.userId,
      task_id: taskId,
      action: actionText,
      from_status: fromStatus,
      to_status: toStatus,
    });

  // 8. Fetch complete refreshed list of tasks to return to client
  const { data: finalTasks, error: finalLoadErr } = await supabase
    .from('tasks')
    .select('*')
    .order('position', { ascending: true });

  if (finalLoadErr || !finalTasks) {
    return fail(500, 'Failed to fetch updated task board');
  }

  // 9. Stream SSE changes
  notifyChange({ type: 'move', tasks: finalTasks });

  return ok(finalTasks);
});
