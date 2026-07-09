import { NextRequest } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, guard } from '@/lib/response';
import { notifyChange } from '@/lib/events';

// Content-only PATCH validation schema (strict, status/position are read-only)
const updateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().nullable().optional(),
  assignee: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  labels: z.array(z.string()).optional(),
  due_date: z.string().nullable().optional(),
  estimate_hours: z.number().nonnegative().optional(),
}).strict(); // .strict() rejects status or position edits

export const PATCH = guard(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  // 1. Authenticate and check permissions
  const currentUser = await getCurrentUser();
  if (!currentUser) return fail(401, 'Unauthorized');
  if (currentUser.role === 'member') {
    return fail(403, 'Forbidden. Members cannot edit tasks.');
  }

  const { id: taskId } = await params;
  const body = await req.json();

  // Validate request body
  const validation = updateTaskSchema.safeParse(body);
  if (!validation.success) {
    return fail(400, validation.error.issues[0].message);
  }

  const updateData = validation.data;

  // 2. Fetch original task to check for assignment modifications
  const { data: originalTask, error: fetchErr } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .maybeSingle();

  if (fetchErr || !originalTask) {
    return fail(404, 'Task not found');
  }

  // 3. Perform update in Supabase
  const { data: updatedTask, error: updateErr } = await supabase
    .from('tasks')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (updateErr) {
    return fail(500, 'Failed to update task: ' + updateErr.message);
  }

  // 4. Log activity if assignee changed
  if (updateData.assignee && updateData.assignee !== originalTask.assignee) {
    const isUnassigning = updateData.assignee === 'Unassigned';
    const isAssigningFromScratch = originalTask.assignee === 'Unassigned';

    await supabase
      .from('activity_log')
      .insert({
        user_id: currentUser.userId,
        task_id: taskId,
        action: isUnassigning ? 'unassigned' : 'assigned',
        from_status: originalTask.assignee, // Holds old assignee
        to_status: updateData.assignee,     // Holds new assignee
      });
  }

  // 5. Notify client streams of updates
  notifyChange({ type: 'update', task: updatedTask });

  return ok(updatedTask);
});

export const DELETE = guard(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  // 1. Authenticate and check permissions
  const currentUser = await getCurrentUser();
  if (!currentUser) return fail(401, 'Unauthorized');
  if (currentUser.role === 'member') {
    return fail(403, 'Forbidden. Members cannot delete tasks.');
  }

  const { id: taskId } = await params;

  // 2. Fetch task status before deletion to log it
  const { data: task, error: fetchErr } = await supabase
    .from('tasks')
    .select('status, title')
    .eq('id', taskId)
    .maybeSingle();

  if (fetchErr || !task) {
    return fail(404, 'Task not found');
  }

  // 3. Delete from Supabase (Comments will automatically cascade delete)
  const { error: deleteErr } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (deleteErr) {
    return fail(500, 'Failed to delete task: ' + deleteErr.message);
  }

  // 4. Log delete action (no task_id since task record is deleted)
  await supabase
    .from('activity_log')
    .insert({
      user_id: currentUser.userId,
      task_id: null,
      action: 'deleted',
      from_status: task.status,
      to_status: null,
    });

  // 5. Stream change signal
  notifyChange({ type: 'delete', taskId });

  return ok({ message: 'Task deleted successfully' });
});
