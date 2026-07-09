-- Supabase DB Schema for Sprintly

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Backlog',
    assignee TEXT NOT NULL DEFAULT 'Unassigned',
    priority TEXT NOT NULL DEFAULT 'medium',
    labels TEXT[] DEFAULT '{}',
    due_date TIMESTAMP WITH TIME ZONE,
    estimate_hours INTEGER DEFAULT 0,
    completed_date TIMESTAMP WITH TIME ZONE,
    position INTEGER DEFAULT 0,
    has_warning BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on tasks position and status for performance
CREATE INDEX IF NOT EXISTS idx_tasks_status_position ON tasks(status, position);

-- 3. Comments Table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Activity Log Table
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Disable Row Level Security (RLS is disabled for Sprintly backend bypass)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log DISABLE ROW LEVEL SECURITY;

-- Seed Users (password for all is: password123)
INSERT INTO users (id, name, email, password_hash, role, avatar)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Admin User', 'admin@sprintly.com', '$2b$10$pSQ4vTI39yWGhKE36NOzHuIUHPNnYuiBke2E/92dI3K0MmPfLdJai', 'admin', 'https://api.dicebear.com/7.x/bottts/svg?seed=admin'),
    ('a0000000-0000-0000-0000-000000000002', 'Manager User', 'manager@sprintly.com', '$2b$10$pSQ4vTI39yWGhKE36NOzHuIUHPNnYuiBke2E/92dI3K0MmPfLdJai', 'manager', 'https://api.dicebear.com/7.x/bottts/svg?seed=manager'),
    ('a0000000-0000-0000-0000-000000000003', 'Member User', 'member@sprintly.com', '$2b$10$pSQ4vTI39yWGhKE36NOzHuIUHPNnYuiBke2E/92dI3K0MmPfLdJai', 'member', 'https://api.dicebear.com/7.x/bottts/svg?seed=member')
ON CONFLICT (email) DO NOTHING;
