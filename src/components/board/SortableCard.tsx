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

const PRIORITY_STYLES: Record<string, string> = {
  high:   'bg-red-100    text-red-700    border-red-300    dark:bg-red-900/50    dark:text-red-300    dark:border-red-700/70',
  low:    'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700/70',
  medium: 'bg-amber-100  text-amber-700  border-amber-300  dark:bg-amber-900/50  dark:text-amber-300  dark:border-amber-700/70',
};

export default function SortableCard({ task, onClick, dragDisabled = false }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled: dragDisabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.2 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  const isOverdue =
    task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done';

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!dragDisabled ? attributes : {})}
      {...(!dragDisabled ? listeners : {})}
      className={[
        /* base */
        'group flex flex-col gap-2 p-4 rounded-2xl relative overflow-hidden',
        /* light bg */  'bg-white',
        /* dark bg  */  'dark:bg-[#1e2535]',
        /* light border */ 'border border-slate-200',
        /* dark border */  'dark:border-slate-600/60',
        /* shadow */    'shadow-sm',
        /* hover */     'hover:shadow-md hover:border-violet-300 dark:hover:border-violet-500/70',
        /* dragging */  isDragging ? 'ring-2 ring-violet-500 shadow-xl' : '',
        /* cursor */    dragDisabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
        'transition-all duration-200',
      ].join(' ')}
    >
      {/* Title */}
      <div
        className="flex justify-between items-start gap-2"
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        <h4 className={[
          'text-sm font-bold pointer-events-none line-clamp-2 transition-colors',
          'text-slate-800 dark:text-white',
          'group-hover:text-violet-600 dark:group-hover:text-violet-400',
        ].join(' ')}>
          {task.title}
        </h4>

        {task.has_warning && (
          <span className="shrink-0 pointer-events-none text-amber-500 dark:text-amber-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667
                   1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34
                   16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </span>
        )}
      </div>

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 pointer-events-none">
          {task.labels.map((lbl) => (
            <span key={lbl} className="px-2 py-0.5 rounded text-[10px] font-bold
              bg-slate-100 dark:bg-slate-700/80
              text-slate-600 dark:text-slate-200
              border border-slate-200 dark:border-slate-600">
              {lbl}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-0.5 flex-wrap gap-2
        border-t border-slate-100 dark:border-slate-600/40 pt-2.5 pointer-events-none">

        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider
            ${PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.medium}`}>
            {task.priority}
          </span>
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            {task.assignee}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px]">
          {task.due_date && (
            <span className={`font-medium ${
              isOverdue
                ? 'text-red-500 dark:text-red-400 font-bold'
                : 'text-slate-400 dark:text-slate-500'
            }`}>
              📅 {fmtDate(task.due_date)}
            </span>
          )}
          <span className="font-bold px-1.5 py-0.5 rounded text-[10px]
            bg-slate-100 dark:bg-slate-700/80
            text-slate-600 dark:text-slate-300
            border border-slate-200 dark:border-slate-600">
            {task.estimate_hours}h
          </span>
        </div>
      </div>
    </div>
  );
}
