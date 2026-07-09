import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ok, fail, guard } from '@/lib/response';
import { isCompletedThisWeek } from '@/lib/dates';
import { Task } from '@/lib/types';

export const GET = guard(async (req: NextRequest) => {
  // Fetch all tasks to compute fresh board metrics
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*');

  if (error || !tasks) {
    return fail(500, 'Failed to fetch board metrics: ' + (error?.message || ''));
  }

  const typedTasks = tasks as Task[];

  // 1. Status distribution initializer
  const statusCounts: Record<string, number> = {
    'Backlog': 0,
    'In Progress': 0,
    'Review': 0,
    'Done': 0,
  };

  // 2. Assignee hours map
  const assigneeHoursMap: Record<string, number> = {};

  // 3. Weekly completed hours accumulator
  let completedThisWeekHours = 0;

  typedTasks.forEach((task) => {
    // Populate status counts
    if (statusCounts[task.status] !== undefined) {
      statusCounts[task.status]++;
    }

    // Populate assignee hours
    const name = task.assignee || 'Unassigned';
    assigneeHoursMap[name] = (assigneeHoursMap[name] || 0) + (task.estimate_hours || 0);

    // Sum weekly done hours
    if (task.status === 'Done' && task.completed_date) {
      if (isCompletedThisWeek(task.completed_date)) {
        completedThisWeekHours += task.estimate_hours || 0;
      }
    }
  });

  // Convert to formatted arrays for charts
  const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  const assigneeDistribution = Object.entries(assigneeHoursMap)
    .map(([assignee, hours]) => ({
      assignee,
      hours,
    }))
    .sort((a, b) => b.hours - a.hours); // sort descending

  return ok({
    statusDistribution,
    assigneeDistribution,
    completedThisWeekHours,
  });
});
