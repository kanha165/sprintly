'use client';

import { useState, useEffect, useRef } from 'react';
import { JWTPayload, ActivityLog } from '@/lib/types';
import { ToastMessage } from './Toast';

interface NotificationBellProps {
  currentUser: JWTPayload;
  triggerToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function NotificationBell({ currentUser, triggerToast }: NotificationBellProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>('');
  
  const initialFetchRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch activities and process toasts
  const fetchActivities = async (isPoll: boolean) => {
    try {
      const response = await fetch('/api/activity');
      if (!response.ok) return;
      const result = await response.json();
      if (!result.ok || !result.data) return;

      const newActivities: ActivityLog[] = result.data;

      // Handle new activity toasts (Only on subsequent polls, not the very first mount fetch)
      if (isPoll && activities.length > 0) {
        // Find activities that aren't in our previous state
        const existingIds = new Set(activities.map(a => a.id));
        const unseen = newActivities.filter(a => !existingIds.has(a.id));

        for (const act of unseen) {
          // Rule: Own actions and reorders are not toasted
          if (act.user_id === currentUser.userId || act.action === 'reordered') {
            continue;
          }

          const userName = act.user?.name || 'Someone';
          const taskTitle = act.task?.title || 'a task';

          let toastText = '';
          if (act.action === 'created') {
            toastText = `${userName} created task "${taskTitle}"`;
          } else if (act.action === 'moved') {
            toastText = `${userName} moved "${taskTitle}" to ${act.to_status}`;
          } else if (act.action === 'completed') {
            toastText = `${userName} completed task "${taskTitle}"`;
          } else if (act.action === 'deleted') {
            toastText = `${userName} deleted a task`;
          } else if (act.action === 'assigned') {
            const assignee = act.to_status;
            if (assignee === currentUser.name) {
              // Highlighted toast when assigned to current user
              triggerToast(`Task "${taskTitle}" was assigned to you!`, 'success');
              continue;
            } else {
              toastText = `${userName} assigned "${taskTitle}" to ${assignee}`;
            }
          } else if (act.action === 'unassigned') {
            toastText = `${userName} unassigned "${taskTitle}"`;
          } else if (act.action === 'imported') {
            toastText = `Seed tasks imported to the board`;
          } else if (act.action === 'reset') {
            toastText = `Board reset to initial data`;
          }

          if (toastText) {
            triggerToast(toastText, 'info');
          }
        }
      }

      setActivities(newActivities);
      
      // Calculate unread count
      const lsTime = localStorage.getItem(`lastSeen_${currentUser.userId}`) || '';
      setLastSeen(lsTime);
      
      if (!lsTime) {
        setUnreadCount(newActivities.length);
      } else {
        const count = newActivities.filter(a => a.created_at && a.created_at > lsTime).length;
        setUnreadCount(count);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Initial load
  useEffect(() => {
    fetchActivities(false);
    
    // Poll every 5 seconds as a robust fallback
    const interval = setInterval(() => {
      fetchActivities(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [activities, currentUser]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Mark all as read
      const nowStr = new Date().toISOString();
      localStorage.setItem(`lastSeen_${currentUser.userId}`, nowStr);
      setLastSeen(nowStr);
      setUnreadCount(0);
    }
  };

  const getActionText = (act: ActivityLog) => {
    const userName = act.user?.name || 'Someone';
    const taskTitle = act.task?.title || 'deleted task';
    const isAssignedToMe = act.action === 'assigned' && act.to_status === currentUser.name;

    let message = '';
    switch (act.action) {
      case 'created':
        message = `created task "${taskTitle}"`;
        break;
      case 'moved':
        message = `moved "${taskTitle}" from ${act.from_status || 'column'} to ${act.to_status}`;
        break;
      case 'completed':
        message = `completed task "${taskTitle}"`;
        break;
      case 'deleted':
        message = `deleted a task`;
        break;
      case 'assigned':
        message = `assigned "${taskTitle}" to ${act.to_status || 'Unassigned'}`;
        break;
      case 'unassigned':
        message = `unassigned "${taskTitle}" (previously assigned to ${act.from_status})`;
        break;
      case 'imported':
        message = `imported the task board`;
        break;
      case 'reset':
        message = `reset the task board`;
        break;
      default:
        message = `${act.action} "${taskTitle}"`;
    }

    return (
      <div className="text-xs">
        <span className="font-semibold text-slate-800 dark:text-slate-200">{userName}</span>{' '}
        <span className="text-slate-600 dark:text-slate-400">{message}</span>
        {isAssignedToMe && (
          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            · you
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={toggleDropdown}
        type="button"
        className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center cursor-pointer hover:border-violet-500 hover:text-violet-500 transition-all duration-200 relative active:scale-95"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-violet-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950 animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Activity & Alerts</h3>
            <span className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 font-semibold px-2 py-0.5 rounded-full">
              Live
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {activities.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                No recent activity to show
              </div>
            ) : (
              activities.slice(0, 10).map((act) => (
                <div key={act.id} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  {getActionText(act)}
                  <span className="text-[9px] text-slate-400 mt-1 block">
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
