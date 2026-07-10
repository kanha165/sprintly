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
  currentUser, issuesFixed, tasksLoaded,
  onResetBoard, isResetting = false, triggerToast,
}: TopBarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) window.location.href = '/login';
      else triggerToast('Logout failed', 'error');
    } catch {
      triggerToast('Logout error', 'error');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full
      bg-white/95 dark:bg-[#0f1117]/95
      backdrop-blur-xl
      border-b border-slate-200 dark:border-slate-700/60
      shadow-sm dark:shadow-slate-900/40
      transition-all duration-200">
      <div className="w-full px-4 md:px-6 h-16 flex items-center justify-between gap-4">

        {/* ── Brand + Badge ── */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Logo mark */}
          <Link href="/board" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600
              flex items-center justify-center shadow-md shadow-violet-500/30
              group-hover:shadow-violet-500/50 transition-shadow">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <span className="text-lg font-extrabold tracking-tight
              bg-gradient-to-r from-violet-600 to-indigo-500
              dark:from-violet-400 dark:to-indigo-400
              bg-clip-text text-transparent
              group-hover:from-violet-500 group-hover:to-indigo-400
              transition-all duration-200">
              Sprintly
            </span>
          </Link>

          {/* Data health badge */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold
            bg-emerald-50 dark:bg-emerald-500/10
            text-emerald-700 dark:text-emerald-400
            border border-emerald-200 dark:border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>{issuesFixed} issues fixed · {tasksLoaded} tasks loaded</span>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav className="flex items-center gap-1">
          {[
            { href: '/board', label: 'Board' },
            { href: '/dashboard', label: 'Dashboard' },
          ].map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  active
                    ? 'bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* ── Actions ── */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Reset Board */}
          {onResetBoard && (
            <button onClick={onResetBoard} disabled={isResetting} type="button"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold
                bg-slate-100 dark:bg-slate-800
                border border-slate-200 dark:border-slate-700
                text-slate-600 dark:text-slate-300
                hover:border-violet-400 dark:hover:border-violet-500
                hover:text-violet-600 dark:hover:text-violet-400
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200 active:scale-95 cursor-pointer">
              {isResetting ? (
                <>
                  <div className="w-3 h-3 border-2 border-slate-400 border-t-violet-500 rounded-full animate-spin" />
                  <span>Resetting…</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15H19" />
                  </svg>
                  <span>Reset Board</span>
                </>
              )}
            </button>
          )}

          <ThemeToggle />
          <NotificationBell currentUser={currentUser} triggerToast={triggerToast} />

          {/* User */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
            <img
              src={currentUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.name)}`}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full border-2 border-violet-200 dark:border-violet-800"
            />
            <div className="hidden lg:flex flex-col">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">{currentUser.name}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">{currentUser.role}</span>
            </div>
            <button onClick={handleLogout} type="button"
              className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500
                hover:text-red-500 dark:hover:text-red-400
                hover:bg-red-50 dark:hover:bg-red-500/10
                transition-colors cursor-pointer"
              title="Logout">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

      </div>
    </header>
  );
}
