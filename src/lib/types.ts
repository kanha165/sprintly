// Types for Sprintly

export type UserRole = 'admin' | 'manager' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  created_at?: string;
}

export type TaskStatus = 'Backlog' | 'In Progress' | 'Review' | 'Done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assignee: string;
  priority: TaskPriority;
  labels: string[];
  due_date: string | null;
  estimate_hours: number;
  completed_date: string | null;
  position: number;
  has_warning: boolean;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  text: string;
  created_at?: string;
  user?: {
    name: string;
    avatar?: string;
    role: string;
  };
}

export type ActivityAction =
  | 'created'
  | 'moved'
  | 'completed'
  | 'reordered'
  | 'assigned'
  | 'unassigned'
  | 'deleted'
  | 'imported'
  | 'reset';

export interface ActivityLog {
  id: string;
  task_id: string | null;
  user_id: string | null;
  action: ActivityAction | string;
  from_status: string | null;
  to_status: string | null;
  created_at?: string;
  user?: {
    name: string;
  };
  task?: {
    title: string;
  };
}

export interface JWTPayload {
  userId: string;
  role: UserRole;
  name: string;
  email: string;
  avatar?: string;
}
