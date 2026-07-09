'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { JWTPayload } from '@/lib/types';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';

interface TopBarProps {
  currentUser: JWTPayload;
  issuesFixed: number;
  tasksLoaded: number;
  onResetBoard?: () => void;
  isResetting?: boolean;
  triggerToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function TopBar({
  currentUser,
  issuesFixed,
  tasksLoaded,
  onResetBoard,
  isResetting = false,
  triggerToast,
}: TopBarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      if (response.ok) {
        window.location.href = '/login';
      } else {
        triggerToast('Logout failed', 'error');
      }
    } catch (error) {
      triggerToast('Logout error', 'error');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Brand & Data Health Badge */}
        <div className="flex items-center gap-4">
          <Link href="/board" className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-violet-500 to-indigo-500 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent active:scale-95 transition-transform">
            Sprintly
          </Link>
          
          {/* Data Health Badge */}
          <div 
            id="data-health-badge"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/30"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{issuesFixed} issues fixed · {tasksLoaded} tasks loaded</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 md:gap-2">
          <Link
            href="/board"
            className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 ${
              pathname === '/board'
                ? 'bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Board
          </Link>
          <Link
            href="/dashboard"
            className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 ${
              pathname === '/dashboard'
                ? 'bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Dashboard
          </Link>
        </nav>

        {/* Action Controls & Profile details */}
        <div className="flex items-center gap-3">
          
          {/* Reset Board button (Only renders when provided) */}
          {onResetBoard && (
            <button
              onClick={onResetBoard}
              disabled={isResetting}
              type="button"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-violet-500 dark:hover:border-violet-500 cursor-pointer disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
            >
              {isResetting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
                  <span>Resetting...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15H19" />
                  </svg>
                  <span>Reset Board</span>
                </>
              )}
            </button>
          )}

          {/* Theme Switcher */}
          <ThemeToggle />

          {/* Bell Notification center */}
          <NotificationBell currentUser={currentUser} triggerToast={triggerToast} />

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-3">
            <img
              src={currentUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.name)}`}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800"
            />
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-bold leading-tight">{currentUser.name}</span>
              <span className="text-[10px] text-slate-400 capitalize">{currentUser.role}</span>
            </div>
            
            <button
              onClick={handleLogout}
              type="button"
              className="p-2 text-slate-400 hover:text-red-500 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors"
              title="Logout"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>

        </div>

      </div>
    </header>
  );
}
