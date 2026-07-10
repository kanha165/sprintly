'use client';

import React from 'react';
import { TaskStatus } from '@/lib/types';
import { useDroppable } from '@dnd-kit/core';

const WIP_LIMITS: Partial<Record<TaskStatus, number>> = {
  'In Progress': 8,
  'Review': 6,
};

const STATUS_DOT: Record<TaskStatus, string> = {
  'Backlog':     'bg-slate-400',
  'In Progress': 'bg-blue-500',
  'Review':      'bg-amber-500',
  'Done':        'bg-emerald-500',
};

interface ColumnHeaderProps {
  status: TaskStatus;
  count: number;
  hours: number;
  doneThisWeekHours?: number;
  isLocked: boolean;
}

export default function ColumnHeader({
  status, count, hours, doneThisWeekHours = 0, isLocked,
}: ColumnHeaderProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const limit = WIP_LIMITS[status];
  const isAtLimit   = limit !== undefined && count >= limit;
  const isNearLimit = limit !== undefined && count >= limit - 1;

  return (
    <div
      ref={setNodeRef}
      className={`pb-3 border-b-2 transition-all duration-200 ${
        isOver
          ? isLocked
            ? 'border-red-500'
            : 'border-violet-500'
          : 'border-transparent'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Left: dot + name + badge */}
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[status]}`} />

          <h3 className="text-sm font-extrabold text-slate-800 dark:text-white tracking-tight">
            {status}
          </h3>

          {isLocked && (
            <span className="text-[10px] font-bold text-red-500 dark:text-red-400">🔒</span>
          )}

          {/* count / limit pill */}
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
            isAtLimit
              ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 border-red-300 dark:border-red-700'
              : isNearLimit
              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-600'
          }`}>
            {count}{limit ? `/${limit}` : ''}
          </span>
        </div>

        {/* Right: hours */}
        <div className="flex flex-col items-end shrink-0">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {hours}h total
          </span>
          {status === 'Done' && (
            <span className="text-[10px] font-semibold text-emerald-500 dark:text-emerald-400">
              {doneThisWeekHours}h this week
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
