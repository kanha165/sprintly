import { NextRequest } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, guard } from '@/lib/response';

const createCommentSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  text: z.string().min(1, 'Comment text is required'),
});

export const GET = guard(async (req: NextRequest) => {
  // Retrieve task ID from query string
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return fail(400, 'Missing taskId parameter');
  }

  // Fetch comments for the task joined with commenter details
  const { data: comments, error } = await supabase
    .from('comments')
    .select('*, user:users(name, avatar, role)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) {
    return fail(500, 'Failed to fetch comments: ' + error.message);
  }

  return ok(comments);
});

export const POST = guard(async (req: NextRequest) => {
  // 1. Authenticate user
  const currentUser = await getCurrentUser();
  if (!currentUser) return fail(401, 'Unauthorized');

  const body = await req.json();
  const validation = createCommentSchema.safeParse(body);
  if (!validation.success) {
    return fail(400, validation.error.issues[0].message);
  }

  const { taskId, text } = validation.data;

  // 2. Insert comment and select back with populated user info
  const { data: newComment, error } = await supabase
    .from('comments')
    .insert({
      task_id: taskId,
      user_id: currentUser.userId,
      text: text.trim(),
    })
    .select('*, user:users(name, avatar, role)')
    .single();

  if (error) {
    return fail(500, 'Failed to post comment: ' + error.message);
  }

  return ok(newComment);
});
