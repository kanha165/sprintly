'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { JWTPayload, ActivityLog } from '@/lib/types';

interface NotificationBellProps {
  currentUser: JWTPayload;
  triggerToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function NotificationBell({ currentUser, triggerToast }: NotificationBellProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  // Store latest activities in a ref so the interval closure is never stale
  // without needing activities in the dependency array (which caused the loop)
  const activitiesRef = useRef<ActivityLog[]>([]);
  activitiesRef.current = activities;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchActivities = useCallback(async (isPoll: boolean) => {
    try {
      const res = await fetch('/api/activity');
      if (!res.ok) return;
      const result = await res.json();
      if (!result.ok || !result.data) return;

      const fresh: ActivityLog[] = result.data;

      // Toast new activity from other users (polls only, not first load)
      if (isPoll && activitiesRef.current.length > 0) {
        const existingIds = new Set(activitiesRef.current.map((a) => a.id));
        for (const act of fresh) {
          if (existingIds.has(act.id)) continue;
          if (act.user_id === currentUser.userId || act.action === 'reordered') continue;

          const userName = act.user?.name || 'Someone';
          const taskTitle = act.task?.title || 'a task';

          if (act.action === 'assigned' && act.to_status === currentUser.name) {
            triggerToast(`Task "${taskTitle}" was assigned to you!`, 'success');
            continue;
          }

          const messages: Record<string, string> = {
            created:  `${userName} created "${taskTitle}"`,
            moved:    `${userName} moved "${taskTitle}" → ${act.to_status}`,
            completed:`${userName} completed "${taskTitle}"`,
            deleted:  `${userName} deleted a task`,
            assigned: `${userName} assigned "${taskTitle}" to ${act.to_status}`,
            unassigned:`${userName} unassigned "${taskTitle}"`,
            imported: `Seed tasks imported to the board`,
            reset:    `Board was reset to initial data`,
          };
          const text = messages[act.action] || `${userName} ${act.action} "${taskTitle}"`;
          triggerToast(text, 'info');
        }
      }

      setActivities(fresh);

      // Unread badge
      const lsTime = localStorage.getItem(`lastSeen_${currentUser.userId}`) || '';
      const count = lsTime
        ? fresh.filter((a) => a.created_at && a.created_at > lsTime).length
        : fresh.length;
      setUnreadCount(count);
    } catch {
      // Silently swallow — network errors during polling should not spam console
    }
  }, [currentUser.userId, currentUser.name, triggerToast]);

  // Initial load + poll every 30s
  // NOTE: activities is NOT in deps — we use activitiesRef for stale-closure safety
  useEffect(() => {
    fetchActivities(false);
    const interval = setInterval(() => fetchActivities(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchActivities]);

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      const now = new Date().toISOString();
      localStorage.setItem(`lastSeen_${currentUser.userId}`, now);
      setUnreadCount(0);
    }
  };

  const getActionText = (act: ActivityLog) => {
    const userName = act.user?.name || 'Someone';
    const taskTitle = act.task?.title || 'deleted task';
    const isMe = act.action === 'assigned' && act.to_status === currentUser.name;

    const messages: Record<string, string> = {
      created:   `created "${taskTitle}"`,
      moved:     `moved "${taskTitle}" → ${act.to_status}`,
      reordered: `reordered tasks`,
      completed: `completed "${taskTitle}"`,
      deleted:   `deleted a task`,
      assigned:  `assigned "${taskTitle}" to ${act.to_status || 'Unassigned'}`,
      unassigned:`unassigned "${taskTitle}"`,
      imported:  `imported the task board`,
      reset:     `reset the task board`,
    };
    const msg = messages[act.action] || `${act.action} "${taskTitle}"`;

    return (
      <div className="text-xs">
        <span className="font-semibold text-slate-800 dark:text-slate-100">{userName}</span>{' '}
        <span className="text-slate-500 dark:text-slate-400">{msg}</span>
        {isMe && (
          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
            you
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={toggleDropdown}
        type="button"
        className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
          flex items-center justify-center cursor-pointer text-slate-600 dark:text-slate-300
          hover:border-violet-500 hover:text-violet-500 dark:hover:border-violet-400 dark:hover:text-violet-400
          transition-all duration-200 relative active:scale-95"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-violet-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Activity</h3>
            <span className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 font-semibold px-2 py-0.5 rounded-full">
              Live
            </span>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {activities.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-400">
                No recent activity
              </div>
            ) : (
              activities.slice(0, 15).map((act) => (
                <div key={act.id}
                  className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  {getActionText(act)}
                  <span className="text-[9px] text-slate-400 mt-0.5 block">
                    {act.created_at ? new Date(act.created_at).toLocaleTimeString() : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
