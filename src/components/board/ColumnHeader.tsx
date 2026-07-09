'use client';

import React from 'react';
import { TaskStatus } from '@/lib/types';
import { useDroppable } from '@dnd-kit/core';

interface ColumnHeaderProps {
  status: TaskStatus;
  count: number;
  hours: number;
  doneThisWeekHours?: number;
  isLocked: boolean;
}

export default function ColumnHeader({
  status,
  count,
  hours,
  doneThisWeekHours = 0,
  isLocked,
}: ColumnHeaderProps) {
  // Make the column header a droppable target itself so card drops on empty columns register correctly
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const getBorderColor = () => {
    if (isOver) {
      return isLocked ? 'border-red-500 bg-red-50/10' : 'border-violet-500 bg-violet-50/10';
    }
    return 'border-transparent';
  };

  return (
    <div
      ref={setNodeRef}
      className={`pb-3 border-b-2 transition-all duration-200 ${getBorderColor()}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Stage name */}
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {status}
          </h3>
          
          {/* Locked Badge */}
          {isLocked && (
            <span 
              className="text-[10px] text-red-500 dark:text-red-400 font-bold flex items-center gap-0.5"
              title="Locked for members"
            >
              🔒 Locked
            </span>
          )}

          {/* Counts */}
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400">
            {count}
          </span>
        </div>

        {/* Estimates total hours */}
        <div className="flex flex-col items-end">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
            {hours}h total
          </span>
          {status === 'Done' && (
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              {doneThisWeekHours}h this week
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
