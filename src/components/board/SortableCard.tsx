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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: dragDisabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.25 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700/60';
      case 'low':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700/60';
      default:
        return 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700/60';
    }
  };

  const isOverdue =
    task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done';

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!dragDisabled ? attributes : {})}
      {...(!dragDisabled ? listeners : {})}
      className={[
        // base
        'group bg-white dark:bg-slate-800/90',
        'border border-slate-200 dark:border-slate-700',
        'p-4 rounded-2xl shadow-sm',
        'flex flex-col gap-2 relative overflow-hidden',
        'hover:shadow-md hover:border-violet-300 dark:hover:border-violet-500',
        'transition-all duration-200',
        dragDisabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
        isDragging ? 'ring-2 ring-violet-500 shadow-xl' : '',
      ].join(' ')}
    >
      {/* Title row */}
      <div
        className="flex justify-between items-start gap-2"
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-50
          group-hover:text-violet-600 dark:group-hover:text-violet-400
          transition-colors line-clamp-2 pointer-events-none">
          {task.title}
        </h4>

        {task.has_warning && (
          <span
            className="shrink-0 text-amber-500 dark:text-amber-400 pointer-events-none"
            title="Auto-repaired during import"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667
                   1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77
                   1.333.192 3 1.732 3z" />
            </svg>
          </span>
        )}
      </div>

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 pointer-events-none">
          {task.labels.map((lbl) => (
            <span key={lbl}
              className="px-2 py-0.5 rounded text-[10px] font-bold
                bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {lbl}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-1 flex-wrap gap-2
        border-t border-slate-100 dark:border-slate-700/60 pt-2.5 pointer-events-none">

        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider
            ${getPriorityStyle(task.priority)}`}>
            {task.priority}
          </span>
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            {task.assignee}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px]">
          {task.due_date && (
            <span className={`font-medium ${
              isOverdue
                ? 'text-red-500 dark:text-red-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}>
              📅 {formatDueDate(task.due_date)}
            </span>
          )}
          <span className="font-bold px-1.5 py-0.5 rounded text-[10px]
            bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            {task.estimate_hours}h
          </span>
        </div>
      </div>
    </div>
  );
}
