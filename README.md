# Sprintly - Agile Kanban Board

A modern, collaborative sprint board with real-time updates, built with Next.js 16, TypeScript, and Supabase.

## Features

- 🎯 **Kanban Board** - Drag-and-drop task management across Backlog, In Progress, Review, and Done columns
- 📊 **Analytics Dashboard** - Track team performance, status distribution, and weekly completion metrics
- 👥 **Role-Based Access** - Admin, Manager, and Member roles with different permissions
- 🔄 **Real-time Updates** - Live task updates using Supabase Realtime (optional)
- 🌓 **Dark/Light Mode** - Beautiful theme switcher with smooth transitions
- 💬 **Comments & Activity** - Task comments and activity logging
- 🔒 **Authentication** - Secure JWT-based auth with HTTP-only cookies

## Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works great)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/kanha165/sprintly
cd ai_agent
npm install
```

### 2. Set Up Supabase

#### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project" and fill in the details
3. Wait for your database to initialize (~2 minutes)

#### Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase/schema.sql`
3. Paste it into the SQL Editor and click "Run"
4. This creates the tables and seeds test users

#### Get Your API Keys

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Key** (secret key - keep this safe!)
   - **Anon/Public Key** (for optional realtime features)

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration (REQUIRED)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# JWT Secret (REQUIRED - must be 32+ characters)
JWT_SECRET=sprintly-super-secret-jwt-token-signing-key-32-chars-long

# Optional: For Supabase Realtime browser features
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
```

⚠️ **Important**: Replace the placeholder values with your actual Supabase credentials!

### 4. Import Sample Data (Optional)

To load sample tasks:

```bash
# This will import tasks from src/data/tasks.json
# Make sure you're logged in first, then visit:
# http://localhost:3000/board
# And use the import feature in the UI
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Login with Test Accounts

The database is seeded with three test users (password for all: `password123`):

- **Admin**: `admin@sprintly.com` - Full access, can manage everything
- **Manager**: `manager@sprintly.com` - Can create/edit tasks, move any task
- **Member**: `member@sprintly.com` - Limited access, cannot modify Done column

## Project Structure

```
ai_agent/
├── src/
│   ├── app/
│   │   ├── api/           # API routes (auth, tasks, stats, etc.)
│   │   ├── board/         # Kanban board page
│   │   ├── dashboard/     # Analytics dashboard
│   │   ├── login/         # Authentication page
│   │   └── layout.tsx     # Root layout with theme support
│   ├── components/        # React components
│   │   ├── board/         # Board-specific components
│   │   ├── Modal.tsx      # Task details modal
│   │   ├── ThemeToggle.tsx
│   │   └── TopBar.tsx
│   ├── lib/               # Utilities and helpers
│   │   ├── auth.ts        # Authentication helpers
│   │   ├── supabase.ts    # Supabase client (server-side)
│   │   ├── jwt.ts         # JWT token handling
│   │   └── types.ts       # TypeScript types
│   └── data/
│       └── tasks.json     # Sample task data
├── supabase/
│   ├── schema.sql         # Database schema
│   └── realtime.sql       # Realtime triggers (optional)
└── .env.local             # Environment variables (you create this)
```

## Key Features Explained

### Role-Based Permissions

- **Admin**: Can do everything
- **Manager**: Can create, edit, delete tasks; move tasks anywhere
- **Member**: Can view and move tasks (except Done column is locked)

### WIP Limits

- **In Progress**: Maximum 5 tasks
- **Review**: Maximum 3 tasks

These are enforced in the UI and prevent column overflow.

### Keyboard Shortcuts

- `Ctrl+Z` / `Cmd+Z`: Undo last task move
- `Ctrl+Shift+Z` / `Cmd+Shift+Z`: Redo task move

### Real-time Updates

If you configure the `NEXT_PUBLIC_*` environment variables, the board will automatically update when other users make changes using Supabase Realtime.

## Troubleshooting

### "TypeError: fetch failed" on Login/Signup

This means your Supabase credentials are not configured correctly:

1. Double-check your `.env.local` file exists in the root directory
2. Verify the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
3. Make sure you ran the `schema.sql` in Supabase SQL Editor
4. Restart your dev server after changing environment variables

### Database Connection Issues

1. Check your Supabase project is active (not paused)
2. Verify your API keys are correct
3. Make sure RLS (Row Level Security) is disabled for all tables (handled by schema.sql)

### Build Errors

```bash
# Clear Next.js cache and rebuild
rm -rf .next
npm run build
```

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT with HTTP-only cookies
- **Styling**: Tailwind CSS
- **Drag & Drop**: @dnd-kit
- **Password Hashing**: bcryptjs
- **Validation**: Zod

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create new task
- `PATCH /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task
- `PATCH /api/tasks/move` - Move task to different column/position

### Analytics
- `GET /api/stats` - Get board statistics

### Other
- `GET /api/comments` - Get task comments
- `POST /api/comments` - Add comment
- `GET /api/activity` - Get activity log
- `POST /api/board/reset` - Reset board to initial state

## Contributing

This is a demo project, but feel free to fork and customize it for your needs!

## License

MIT
