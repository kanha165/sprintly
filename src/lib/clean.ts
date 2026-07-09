import { parseCleanDate } from './dates';
import { Task, TaskStatus, TaskPriority } from './types';

interface CleanResult {
  cleaned: Partial<Task>[];
  issuesFixed: number;
  tasksLoaded: number;
}

/**
 * Pure function to clean raw dirty tasks array.
 * Enforces deduplication, status normalization, assignee sanitation, estimate repairs,
 * and date parsing. Returns clean list along with counts.
 */
export function cleanTasks(rawTasks: any[]): CleanResult {
  if (!Array.isArray(rawTasks)) {
    return { cleaned: [], issuesFixed: 0, tasksLoaded: 0 };
  }

  let issuesFixed = 0;

  // 1. Deduplicate by ID (keep the later occurrence)
  const uniqueTasksMap = new Map<string, { record: any; originalIndex: number }>();
  let dupCount = 0;

  for (let i = 0; i < rawTasks.length; i++) {
    const task = rawTasks[i];
    const id = String(task.id || `task-fallback-${i}`).trim();
    
    if (uniqueTasksMap.has(id)) {
      dupCount++;
    }
    uniqueTasksMap.set(id, { record: task, originalIndex: i });
  }

  // Increment issuesFixed by the number of duplicate records discarded
  issuesFixed += dupCount;

  // 2. Clean each unique task
  const cleanedTasks: Partial<Task>[] = [];
  const statusCounts: Record<string, number> = {}; // To compute positions in each column

  // Sort unique tasks in their original order of appearance
  const sortedUniqueTasks = Array.from(uniqueTasksMap.entries())
    .sort((a, b) => a[1].originalIndex - b[1].originalIndex);

  for (const [id, { record }] of sortedUniqueTasks) {
    const title = String(record.title || 'Untitled Task').trim();
    const description = record.description ? String(record.description).trim() : '';
    
    // Assignee repair
    let assignee = record.assignee;
    let assigneeRepaired = false;
    if (assignee === null || assignee === undefined) {
      assignee = 'Unassigned';
      assigneeRepaired = true;
    } else {
      const trimmed = String(assignee).trim();
      const lower = trimmed.toLowerCase();
      if (trimmed === '' || lower === 'n/a' || lower === 'null' || lower === 'undefined') {
        assignee = 'Unassigned';
        assigneeRepaired = true;
      } else {
        assignee = trimmed;
      }
    }
    if (assigneeRepaired) {
      issuesFixed++;
    }

    // Estimate hours repair (negative or non-numeric -> 0; string numeric is valid and parsed without issue count)
    let estimateHours = record.estimate_hours;
    let estimateRepaired = false;
    let parsedHours = 0;

    if (estimateHours === null || estimateHours === undefined) {
      parsedHours = 0;
      estimateRepaired = true;
    } else if (typeof estimateHours === 'number') {
      if (estimateHours < 0) {
        parsedHours = 0;
        estimateRepaired = true;
      } else {
        parsedHours = Math.floor(estimateHours);
      }
    } else if (typeof estimateHours === 'string') {
      const trimmed = estimateHours.trim();
      if (/^\d+$/.test(trimmed)) {
        parsedHours = parseInt(trimmed, 10);
      } else {
        parsedHours = 0;
        estimateRepaired = true;
      }
    } else {
      parsedHours = 0;
      estimateRepaired = true;
    }

    if (estimateRepaired) {
      issuesFixed++;
    }

    // Status normalization
    let status = record.status;
    let normalizedStatus: TaskStatus = 'Backlog';
    let statusRepaired = false;
    let hasWarning = false;

    if (status === null || status === undefined) {
      normalizedStatus = 'Backlog';
      hasWarning = true;
      statusRepaired = true;
    } else {
      const trimmedStatus = String(status).trim();
      const lowerStatus = trimmedStatus.toLowerCase();

      if (lowerStatus === 'backlog') {
        normalizedStatus = 'Backlog';
      } else if (lowerStatus === 'in progress') {
        normalizedStatus = 'In Progress';
      } else if (lowerStatus === 'review') {
        normalizedStatus = 'Review';
      } else if (lowerStatus === 'done') {
        normalizedStatus = 'Done';
      } else {
        normalizedStatus = 'Backlog';
        hasWarning = true;
        statusRepaired = true;
      }
    }

    if (statusRepaired) {
      issuesFixed++;
    }

    // Priority default
    const priorityInput = String(record.priority || 'medium').trim().toLowerCase();
    const priority: TaskPriority =
      priorityInput === 'high' ? 'high' : priorityInput === 'low' ? 'low' : 'medium';

    // Labels default
    const labels = Array.isArray(record.labels)
      ? record.labels.map((l: any) => String(l).trim()).filter(Boolean)
      : [];

    // Date parsing
    const dueDateObj = parseCleanDate(record.due_date);
    const dueDate = dueDateObj ? dueDateObj.toISOString() : null;

    // Completed date (if Done, completed date must exist. If not Done, completed date is null)
    let completedDate: string | null = null;
    if (normalizedStatus === 'Done') {
      const compDateObj = parseCleanDate(record.completed_date);
      completedDate = compDateObj ? compDateObj.toISOString() : new Date().toISOString();
    }

    // Set position within its status column (0-indexed)
    if (!statusCounts[normalizedStatus]) {
      statusCounts[normalizedStatus] = 0;
    }
    const position = statusCounts[normalizedStatus];
    statusCounts[normalizedStatus]++;

    const cleanedTask: Partial<Task> = {
      id,
      title,
      description,
      status: normalizedStatus,
      assignee,
      priority,
      labels,
      due_date: dueDate,
      estimate_hours: parsedHours,
      completed_date: completedDate,
      position,
      has_warning: hasWarning,
      created_by: null, // Initial seed tasks have system creator
    };

    cleanedTasks.push(cleanedTask);
  }

  return {
    cleaned: cleanedTasks,
    issuesFixed,
    tasksLoaded: cleanedTasks.length,
  };
}
