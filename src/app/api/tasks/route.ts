import { NextRequest } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, guard } from '@/lib/response';
import { notifyChange } from '@/lib/events';

// Validation schema for creating a task
const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),
  status: z.enum(['Backlog', 'In Progress', 'Review', 'Done']).default('Backlog'),
  assignee: z.string().default('Unassigned'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  labels: z.array(z.string()).default([]),
  due_date: z.string().nullable().optional(),
  estimate_hours: z.number().nonnegative().default(0),
});

export const GET = guard(async (req: NextRequest) => {
  // Fetch all tasks ordered by their position ascending
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .order('position', { ascending: true });

  if (error) {
    return fail(500, 'Failed to fetch tasks: ' + error.message);
  }

  return ok(tasks);
});

export const POST = guard(async (req: NextRequest) => {
  // 1. Authenticate and enforce manager/admin permissions
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return fail(401, 'Unauthorized');
  }
  
  if (currentUser.role === 'member') {
    return fail(403, 'Forbidden. Members cannot create tasks.');
  }

  const body = await req.json();
  const validation = createTaskSchema.safeParse(body);
  if (!validation.success) {
    return fail(400, validation.error.issues[0].message);
  }

  const {
    title,
    description,
    status,
    assignee,
    priority,
    labels,
    due_date,
    estimate_hours,
  } = validation.data;

  // 2. WIP limit check
  if (status === 'In Progress') {
    const { count, error: countErr } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'In Progress');

    if (countErr) return fail(500, 'Failed checking WIP limit');
    if ((count || 0) >= 5) {
      return fail(409, 'WIP Limit Exceeded: In Progress column is full (max 5)');
    }
  }

  if (status === 'Review') {
    const { count, error: countErr } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Review');

    if (countErr) return fail(500, 'Failed checking WIP limit');
    if ((count || 0) >= 3) {
      return fail(409, 'WIP Limit Exceeded: Review column is full (max 3)');
    }
  }

  // 3. Find the ending position in the target column
  const { data: colTasks, error: colErr } = await supabase
    .from('tasks')
    .select('position')
    .eq('status', status);

  if (colErr) return fail(500, 'Failed checking column positions');
  const position = colTasks.length;

  // 4. Set completed date if status is Done
  const completed_date = status === 'Done' ? new Date().toISOString() : null;

  // 5. Generate unique ID and insert task
  const taskId = `task-${Date.now()}`;
  
  const { data: newTask, error: insertErr } = await supabase
    .from('tasks')
    .insert({
      id: taskId,
      title,
      description: description || null,
      status,
      assignee,
      priority,
      labels,
      due_date: due_date || null,
      estimate_hours,
      completed_date,
      position,
      has_warning: false,
      created_by: currentUser.userId,
    })
    .select()
    .single();

  if (insertErr) {
    return fail(500, 'Failed to create task: ' + insertErr.message);
  }

  // 6. Log activity: creation log
  await supabase
    .from('activity_log')
    .insert({
      user_id: currentUser.userId,
      task_id: taskId,
      action: status === 'Done' ? 'completed' : 'created',
      from_status: null,
      to_status: status,
    });

  // 7. Log activity: assignment log (if assigned to someone initially)
  if (assignee && assignee !== 'Unassigned') {
    await supabase
      .from('activity_log')
      .insert({
        user_id: currentUser.userId,
        task_id: taskId,
        action: 'assigned',
        from_status: 'Unassigned',
        to_status: assignee,
      });
  }

  // 8. Stream changes live
  notifyChange({ type: 'create', task: newTask });

  return ok(newTask);
});
