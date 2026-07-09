'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  pointerWithin,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { JWTPayload, Task, TaskStatus } from '@/lib/types';
import { isCompletedThisWeek } from '@/lib/dates';
import TopBar from '../TopBar';
import ToastContainer, { ToastMessage } from '../Toast';
import TaskModal from '../Modal';
import ColumnHeader from './ColumnHeader';
import SortableCard from './SortableCard';

interface BoardClientProps {
  currentUser: JWTPayload;
}

interface MoveAction {
  taskId: string;
  fromStatus: TaskStatus;
  fromPosition: number;
  toStatus: TaskStatus;
  toPosition: number;
}

export default function BoardClient({ currentUser }: BoardClientProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  // Data health badges stats
  const [issuesFixed, setIssuesFixed] = useState(13);
  const [tasksLoaded, setTasksLoaded] = useState(37);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Active dragged card for overlay
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<MoveAction[]>([]);
  const [redoStack, setRedoStack] = useState<MoveAction[]>([]);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Task details modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const triggerToast = (text: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  const handleCloseToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) throw new Error('Failed to load tasks');
      const result = await response.json();
      if (result.ok) {
        setTasks(result.data || []);
      }
    } catch (error: any) {
      triggerToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Mount logic: fetch tasks and load metadata counts
  useEffect(() => {
    fetchTasks();
    const fixed = localStorage.getItem('issuesFixed');
    const loaded = localStorage.getItem('tasksLoaded');
    if (fixed !== null) setIssuesFixed(parseInt(fixed, 10));
    if (loaded !== null) setTasksLoaded(parseInt(loaded, 10));
  }, []);

  // Keyboard shortcut listener for Ctrl+Z and Ctrl+Shift+Z (Undo/Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack, tasks]);

  // List of distinct assignees for filter
  const allAssignees = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.assignee) set.add(t.assignee);
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Column header hours computations (uses FULL dataset, ignores filters)
  const columnMetrics = useMemo(() => {
    const metrics: Record<TaskStatus, { count: number; hours: number; doneThisWeekHours?: number }> = {
      'Backlog': { count: 0, hours: 0 },
      'In Progress': { count: 0, hours: 0 },
      'Review': { count: 0, hours: 0 },
      'Done': { count: 0, hours: 0, doneThisWeekHours: 0 },
    };

    tasks.forEach((t) => {
      const status = t.status;
      if (metrics[status]) {
        metrics[status].count++;
        metrics[status].hours += t.estimate_hours || 0;

        if (status === 'Done' && t.completed_date) {
          if (isCompletedThisWeek(t.completed_date)) {
            metrics['Done'].doneThisWeekHours! += t.estimate_hours || 0;
          }
        }
      }
    });

    return metrics;
  }, [tasks]);

  // Filters application (only filters visual display)
  const visibleTasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      'Backlog': [],
      'In Progress': [],
      'Review': [],
      'Done': [],
    };

    tasks.forEach((task) => {
      // 1. Search filter
      if (debouncedSearch && !task.title.toLowerCase().includes(debouncedSearch.toLowerCase())) {
        return;
      }
      // 2. Assignee multi-select filter
      if (selectedAssignees.length > 0 && !selectedAssignees.includes(task.assignee)) {
        return;
      }
      // 3. Overdue filter
      if (overdueOnly) {
        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done';
        if (!isOverdue) return;
      }

      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    // Ensure they are sorted by position index
    Object.keys(grouped).forEach((key) => {
      grouped[key as TaskStatus].sort((a, b) => a.position - b.position);
    });

    return grouped;
  }, [tasks, debouncedSearch, selectedAssignees, overdueOnly]);

  // Re-import Board helper
  const handleResetBoard = async () => {
    setIsResetting(true);
    try {
      const response = await fetch('/api/board/reset', { method: 'POST' });
      const result = await response.json();
      if (result.ok) {
        setTasks(result.data?.tasks || []);
        setIssuesFixed(result.data?.issuesFixed || 13);
        setTasksLoaded(result.data?.tasksLoaded || 37);
        localStorage.setItem('issuesFixed', String(result.data?.issuesFixed || 13));
        localStorage.setItem('tasksLoaded', String(result.data?.tasksLoaded || 37));
        setUndoStack([]);
        setRedoStack([]);
        triggerToast('Board reset to original seed data', 'success');
      } else {
        triggerToast(result.error || 'Reset failed', 'error');
      }
    } catch (error) {
      triggerToast('Network error on reset', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  // Sensor configuration for dragging
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // click opens details, drag moves card
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const cardId = event.active.id as string;
    const task = tasks.find((t) => t.id === cardId);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const draggedTask = tasks.find((t) => t.id === activeId);
    if (!draggedTask) return;

    const fromStatus = draggedTask.status;
    const fromPosition = draggedTask.position;

    // Resolve destination status and index
    let toStatus: TaskStatus;
    let targetIndex = 0;

    // Check if dropping over another card or a column directly
    const targetTask = tasks.find((t) => t.id === overId);
    
    if (targetTask) {
      toStatus = targetTask.status;
      targetIndex = targetTask.position;
    } else {
      toStatus = overId as TaskStatus; // dropping onto empty column
      // Find the count of tasks in that status to put it at the end
      const tasksInCol = tasks.filter((t) => t.status === toStatus);
      targetIndex = tasksInCol.length;
    }

    // If position and status did not change, ignore
    if (fromStatus === toStatus && fromPosition === targetIndex) {
      return;
    }

    // --- Role Check Enforcements ---
    const isMember = currentUser.role === 'member';
    if (isMember) {
      if (fromStatus === 'Done' || toStatus === 'Done') {
        triggerToast('Done column is locked 🔒 members cannot move tasks in or out.', 'error');
        return;
      }
    }

    // --- WIP Limit Checks (Excluding same column reordering) ---
    if (fromStatus !== toStatus) {
      if (toStatus === 'In Progress') {
        const inProgressCount = tasks.filter((t) => t.status === 'In Progress').length;
        if (inProgressCount >= 5) {
          triggerToast('WIP Limit Exceeded: In Progress cannot exceed 5 cards.', 'error');
          return;
        }
      }
      if (toStatus === 'Review') {
        const reviewCount = tasks.filter((t) => t.status === 'Review').length;
        if (reviewCount >= 3) {
          triggerToast('WIP Limit Exceeded: Review cannot exceed 3 cards.', 'error');
          return;
        }
      }
    }

    // Perform move action
    await executeMove({
      taskId: activeId,
      fromStatus,
      fromPosition,
      toStatus,
      toPosition: targetIndex,
    });
  };

  const executeMove = async (move: MoveAction, isUndoOrRedo = false) => {
    // 1. Optimistic UI update
    const previousTasks = [...tasks];
    
    // Perform state reorder
    const updated = reorderTasksLocal(tasks, move);
    setTasks(updated);

    try {
      const response = await fetch('/api/tasks/move', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: move.taskId,
          toStatus: move.toStatus,
          position: move.toPosition,
        }),
      });

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || 'Move rejected by server');
      }

      // Sync state with precise database indices returned by server
      if (result.data) {
        setTasks(result.data);
      }

      // Manage undo/redo history stacks
      if (!isUndoOrRedo) {
        setUndoStack((prev) => [...prev.slice(-9), move]); // Keep last 10 actions
        setRedoStack([]); // Clear redo
      }
    } catch (error: any) {
      triggerToast(error.message || 'Movement failed', 'error');
      // Revert optimistic update on failure
      setTasks(previousTasks);
    }
  };

  const reorderTasksLocal = (list: Task[], move: MoveAction): Task[] => {
    const taskToMove = list.find((t) => t.id === move.taskId);
    if (!taskToMove) return list;

    // Filter out target task
    const remaining = list.filter((t) => t.id !== move.taskId);

    // Update status for the moved task
    const updatedTask = { ...taskToMove, status: move.toStatus };

    // Separate columns
    const sourceCol = remaining.filter((t) => t.status === move.fromStatus).sort((a, b) => a.position - b.position);
    const destCol = remaining.filter((t) => t.status === move.toStatus).sort((a, b) => a.position - b.position);

    // Insert task into destination column at target index
    destCol.splice(move.toPosition, 0, updatedTask);

    // Reindex positions
    sourceCol.forEach((t, i) => {
      t.position = i;
    });
    destCol.forEach((t, i) => {
      t.position = i;
    });

    // Merge everything back
    const otherTasks = remaining.filter(
      (t) => t.status !== move.fromStatus && t.status !== move.toStatus
    );

    return [...otherTasks, ...sourceCol, ...destCol];
  };

  // Undo execution handler
  const handleUndo = () => {
    if (undoStack.length === 0) {
      triggerToast('Nothing to undo', 'info');
      return;
    }
    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    const inverseAction: MoveAction = {
      taskId: lastAction.taskId,
      fromStatus: lastAction.toStatus,
      fromPosition: lastAction.toPosition,
      toStatus: lastAction.fromStatus,
      toPosition: lastAction.fromPosition,
    };

    setRedoStack((prev) => [...prev, lastAction]);
    executeMove(inverseAction, true);
    triggerToast('Movement undone', 'success');
  };

  // Redo execution handler
  const handleRedo = () => {
    if (redoStack.length === 0) {
      triggerToast('Nothing to redo', 'info');
      return;
    }
    const nextAction = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));

    setUndoStack((prev) => [...prev, nextAction]);
    executeMove(nextAction, true);
    triggerToast('Movement redone', 'success');
  };

  // Save Modal Action (Create or Edit Content)
  const handleSaveTask = async (taskData: Partial<Task>) => {
    try {
      const isEditing = !!selectedTask;
      const url = isEditing ? `/api/tasks/${selectedTask.id}` : '/api/tasks';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || 'Failed to save task');
      }

      // Re-fetch all tasks to sync complete board layout
      await fetchTasks();
      triggerToast(isEditing ? 'Task updated successfully' : 'Task created successfully', 'success');
    } catch (error: any) {
      triggerToast(error.message, 'error');
      throw error;
    }
  };

  // Delete task action
  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || 'Failed to delete task');
      }

      // Re-fetch to sync
      await fetchTasks();
      triggerToast('Task deleted successfully', 'success');
    } catch (error: any) {
      triggerToast(error.message, 'error');
      throw error;
    }
  };

  const handleOpenEditModal = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Navbar */}
      <TopBar
        currentUser={currentUser}
        issuesFixed={issuesFixed}
        tasksLoaded={tasksLoaded}
        onResetBoard={handleResetBoard}
        isResetting={isResetting}
        triggerToast={triggerToast}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 flex flex-col gap-6">
        
        {/* Filters Top Section */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 md:p-6 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Title Search */}
            <div className="relative flex-1 sm:flex-initial">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tasks..."
                className="w-full sm:w-64 bg-slate-50 border border-slate-200 focus:border-violet-500 dark:bg-slate-950 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm outline-none transition-all"
              />
            </div>

            {/* Assignee Filter Dropdown */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Assignee:</span>
              <div className="flex gap-1">
                {allAssignees.map((assignee) => {
                  const isSelected = selectedAssignees.includes(assignee);
                  return (
                    <button
                      key={assignee}
                      onClick={() => {
                        setSelectedAssignees((prev) =>
                          isSelected ? prev.filter((a) => a !== assignee) : [...prev, assignee]
                        );
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-violet-600 border-violet-600 text-white'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                      }`}
                    >
                      {assignee}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-100 dark:border-slate-800/60 pt-3 md:pt-0">
            {/* Overdue Switch */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="rounded text-violet-600 focus:ring-violet-500 border-slate-300 w-4 h-4"
              />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Overdue Only</span>
            </label>

            {/* Create Task Button (Disabled for Members) */}
            {currentUser.role !== 'member' && (
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors active:scale-95 shadow-md shadow-violet-500/20 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Task</span>
              </button>
            )}
          </div>
        </section>

        {/* Board Columns (DND Context Wrapper) */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
            <span className="text-sm font-semibold">Loading your sprint board...</span>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin} // Pointer collision requirement
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start flex-1 select-none">
              {(['Backlog', 'In Progress', 'Review', 'Done'] as TaskStatus[]).map((status) => {
                const metrics = columnMetrics[status];
                const list = visibleTasksByStatus[status];
                const isColumnLocked = status === 'Done' && currentUser.role === 'member';

                return (
                  <div
                    key={status}
                    className="flex flex-col bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/50 rounded-3xl p-4 shadow-sm flex-1 min-h-[500px]"
                  >
                    {/* Header */}
                    <ColumnHeader
                      status={status}
                      count={metrics.count}
                      hours={metrics.hours}
                      doneThisWeekHours={metrics.doneThisWeekHours}
                      isLocked={isColumnLocked}
                    />

                    {/* Draggable context list */}
                    <SortableContext
                      items={list.map((t) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div
                        id={status}
                        className="flex flex-col gap-3 mt-4 flex-1 min-h-[400px]"
                      >
                        {list.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                            <span className="text-xs text-slate-400">
                              {isColumnLocked ? 'Done column locked 🔒' : 'Empty. Drop cards here.'}
                            </span>
                          </div>
                        ) : (
                          list.map((task) => (
                            <SortableCard
                              key={task.id}
                              task={task}
                              onClick={() => handleOpenEditModal(task)}
                              // Done cards are drag-disabled for members
                              dragDisabled={isColumnLocked}
                            />
                          ))
                        )}
                      </div>
                    </SortableContext>
                  </div>
                );
              })}
            </div>

            {/* Custom drag overlay to represent card visually during drags */}
            <DragOverlay dropAnimation={null}>
              {activeTask ? (
                <div className="bg-white dark:bg-slate-900 border border-violet-500 rounded-2xl p-4 shadow-2xl opacity-90 cursor-grabbing text-left scale-105 transition-transform duration-100">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-2">
                      {activeTask.title}
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {activeTask.labels?.map((lbl) => (
                      <span key={lbl} className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800">
                        {lbl}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold">{activeTask.assignee}</span>
                    <span className="font-semibold">{activeTask.estimate_hours}h</span>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {/* Floating Alerts Container */}
      <ToastContainer toasts={toasts} onClose={handleCloseToast} />

      {/* Tasks Details / Editor Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTask}
        currentUser={currentUser}
        allUsers={allAssignees}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        triggerToast={triggerToast}
      />
    </div>
  );
}
