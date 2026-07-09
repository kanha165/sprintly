'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/lib/types';

interface SortableCardProps {
  task: Task;
  onClick: () => void;
  dragDisabled?: boolean;
}

export default function SortableCard({ task, onClick, dragDisabled = false }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: dragDisabled, // Disable dragging if dragDisabled is true
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200/50 dark:border-red-900/30';
      case 'low':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-900/30';
      default:
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/50 dark:border-amber-900/30';
    }
  };

  // Check if task is overdue (due_date exists, is in the past, and status is not Done)
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done';

  // Format due date to a human readable format
  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 text-left flex flex-col gap-2 relative overflow-hidden ${
        dragDisabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      {/* Drag handle/trigger area (only active if not dragDisabled) */}
      <div 
        {...(dragDisabled ? {} : attributes)}
        {...(dragDisabled ? {} : listeners)}
        className="absolute top-0 left-0 right-0 h-4 focus:outline-none pointer-events-auto"
        title={dragDisabled ? 'Drag disabled for members' : 'Drag to move'}
      />

      {/* Main card body (clicking open modal) */}
      <div onClick={onClick} className="pointer-events-auto mt-2 flex flex-col gap-2">
        <div className="flex justify-between items-start gap-2">
          {/* Title */}
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-2">
            {task.title}
          </h4>
          
          {/* Warning Indicator */}
          {task.has_warning && (
            <span 
              className="shrink-0 inline-flex items-center justify-center text-amber-500 hover:text-amber-600 transition-colors"
              title="This task was auto-repaired during import (dirty source data)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
          )}
        </div>

        {/* Labels list */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.labels.map((lbl) => (
              <span
                key={lbl}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              >
                {lbl}
              </span>
            ))}
          </div>
        )}

        {/* Footer info: assignee, priority, due date, estimate */}
        <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-2.5">
          <div className="flex items-center gap-2">
            {/* Priority Badge */}
            <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${getPriorityStyle(task.priority)}`}>
              {task.priority}
            </span>
            
            {/* Assignee */}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {task.assignee}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Due date */}
            {task.due_date && (
              <span className={`font-medium ${isOverdue ? 'text-red-500 dark:text-red-400 font-bold' : ''}`}>
                📅 {formatDueDate(task.due_date)}
              </span>
            )}

            {/* Estimate hours */}
            <span className="font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
              {task.estimate_hours}h
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
