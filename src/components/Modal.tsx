'use client';

import React, { useState, useEffect } from 'react';
import { Task, JWTPayload, Comment } from '@/lib/types';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null; // null means "Create Task" mode
  currentUser: JWTPayload;
  allUsers: string[]; // List of potential assignees
  onSave: (taskData: Partial<Task>) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  triggerToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function TaskModal({
  isOpen,
  onClose,
  task,
  currentUser,
  allUsers,
  onSave,
  onDelete,
  triggerToast,
}: ModalProps) {
  const isEditMode = !!task;
  const isManagerOrAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('Unassigned');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [labels, setLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimateHours, setEstimateHours] = useState<number>(0);
  const [status, setStatus] = useState<'Backlog' | 'In Progress' | 'Review' | 'Done'>('Backlog');

  // Comments states
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [savingTask, setSavingTask] = useState(false);

  // Sync form states with selected task
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setAssignee(task.assignee || 'Unassigned');
      setPriority(task.priority || 'medium');
      setLabels(task.labels || []);
      setDueDate(task.due_date ? task.due_date.substring(0, 10) : '');
      setEstimateHours(task.estimate_hours || 0);
      setStatus(task.status || 'Backlog');
      fetchComments(task.id);
    } else {
      // Clear form for Create Task mode
      setTitle('');
      setDescription('');
      setAssignee('Unassigned');
      setPriority('medium');
      setLabels([]);
      setDueDate('');
      setEstimateHours(0);
      setStatus('Backlog');
      setComments([]);
    }
  }, [task, isOpen]);

  const fetchComments = async (taskId: string) => {
    setLoadingComments(true);
    try {
      const response = await fetch(`/api/comments?taskId=${encodeURIComponent(taskId)}`);
      if (!response.ok) return;
      const result = await response.json();
      if (result.ok) {
        setComments(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddLabel = () => {
    const trimmed = newLabel.trim();
    if (trimmed && !labels.includes(trimmed)) {
      setLabels([...labels, trimmed]);
      setNewLabel('');
    }
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    if (!isManagerOrAdmin && isEditMode) return; // Disallow for members on existing tasks
    setLabels(labels.filter((l) => l !== labelToRemove));
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !task) return;

    setSavingComment(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          text: newComment.trim(),
        }),
      });

      const result = await response.json();
      if (result.ok) {
        setComments([result.data, ...comments]);
        setNewComment('');
        triggerToast('Comment posted', 'success');
      } else {
        triggerToast(result.error || 'Failed to post comment', 'error');
      }
    } catch (error) {
      triggerToast('Error posting comment', 'error');
    } finally {
      setSavingComment(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManagerOrAdmin && isEditMode) {
      triggerToast('Permission denied. Managers/Admins only.', 'error');
      return;
    }

    setSavingTask(true);
    try {
      const taskData: Partial<Task> = {
        title: title.trim(),
        description: description.trim(),
        assignee,
        priority,
        labels,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        estimate_hours: estimateHours,
      };

      // Starting column is only editable during creation
      if (!isEditMode) {
        taskData.status = status;
      }

      await onSave(taskData);
      onClose();
    } catch (error) {
      // Handled by parent
    } finally {
      setSavingTask(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!task || !onDelete) return;
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await onDelete(task.id);
        onClose();
      } catch (error) {
        // Handled by parent
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] z-10 animate-scale-up">
        
        {/* Left Side: Task Fields Form */}
        <form 
          onSubmit={handleFormSubmit}
          className="flex-1 p-6 md:p-8 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 space-y-5"
        >
          <div className="flex justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-slate-950 dark:text-slate-50">
              {isEditMode ? 'Task Details' : 'Create Task'}
            </h2>
            {/* Status Pill Indicator */}
            {isEditMode ? (
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Current Status
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                  {status}
                </span>
              </div>
            ) : (
              <div className="flex flex-col">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1" htmlFor="starting-status">
                  Initial Status
                </label>
                <select
                  id="starting-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-xs font-semibold px-3 py-1 rounded-full outline-none focus:border-violet-500"
                >
                  <option value="Backlog">Backlog</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Done">Done</option>
                </select>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide" htmlFor="task-title">Title</label>
              <input
                id="task-title"
                type="text"
                required
                disabled={isEditMode && !isManagerOrAdmin}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Database replication audit"
                className="w-full bg-slate-50 border border-slate-200 focus:border-violet-500 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none transition-all disabled:opacity-75 disabled:cursor-not-allowed"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide" htmlFor="task-desc">Description</label>
              <textarea
                id="task-desc"
                rows={3}
                disabled={isEditMode && !isManagerOrAdmin}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed breakdown of replication lag and mitigation plans..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-violet-500 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none transition-all resize-none disabled:opacity-75 disabled:cursor-not-allowed"
              />
            </div>

            {/* Grid for Assignee, Hours, Priority, Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Assignee */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide" htmlFor="task-assignee">Assignee</label>
                <select
                  id="task-assignee"
                  disabled={isEditMode && !isManagerOrAdmin}
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-violet-500 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none transition-all disabled:opacity-75"
                >
                  <option value="Unassigned">Unassigned</option>
                  {allUsers.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              {/* Estimate Hours */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide" htmlFor="task-hours">Estimate Hours</label>
                <input
                  id="task-hours"
                  type="number"
                  min={0}
                  disabled={isEditMode && !isManagerOrAdmin}
                  value={estimateHours}
                  onChange={(e) => setEstimateHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-violet-500 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none transition-all disabled:opacity-75"
                />
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide" htmlFor="task-priority">Priority</label>
                <select
                  id="task-priority"
                  disabled={isEditMode && !isManagerOrAdmin}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-violet-500 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none transition-all disabled:opacity-75"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide" htmlFor="task-due">Due Date</label>
                <input
                  id="task-due"
                  type="date"
                  disabled={isEditMode && !isManagerOrAdmin}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-violet-500 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none transition-all disabled:opacity-75"
                />
              </div>
            </div>

            {/* Labels Section */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Labels</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {labels.length === 0 ? (
                  <span className="text-xs text-slate-400">No labels added</span>
                ) : (
                  labels.map((lbl) => (
                    <span
                      key={lbl}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      <span>{lbl}</span>
                      {(!isEditMode || isManagerOrAdmin) && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLabel(lbl)}
                          className="text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          &times;
                        </button>
                      )}
                    </span>
                  ))
                )}
              </div>
              
              {/* Add Label input */}
              {(!isEditMode || isManagerOrAdmin) && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="add-label"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddLabel();
                      }
                    }}
                    className="bg-slate-50 border border-slate-200 focus:border-violet-500 dark:bg-slate-950 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none transition-all w-32"
                  />
                  <button
                    type="button"
                    onClick={handleAddLabel}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-5">
            {isEditMode && isManagerOrAdmin && onDelete ? (
              <button
                type="button"
                onClick={handleDeleteTask}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-900/30 hover:bg-red-100 cursor-pointer transition-colors active:scale-95"
              >
                Delete Task
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              
              {(!isEditMode || isManagerOrAdmin) && (
                <button
                  type="submit"
                  disabled={savingTask}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-violet-600 text-white hover:bg-violet-500 cursor-pointer disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors active:scale-95 shadow-lg shadow-violet-500/20"
                >
                  {savingTask ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Task'}
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Right Side: Comments (Only visible in edit mode) */}
        <div className="w-full md:w-80 bg-slate-50/50 dark:bg-slate-900/50 p-6 md:p-8 flex flex-col max-h-96 md:max-h-none overflow-hidden">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center justify-between">
            <span>Comments</span>
            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold px-2 py-0.5 rounded-full">
              {comments.length}
            </span>
          </h3>

          {!isEditMode ? (
            <div className="flex-1 flex items-center justify-center text-center p-4">
              <p className="text-xs text-slate-400">Comments will be available after task creation.</p>
            </div>
          ) : (
            <>
              {/* Comment submission form */}
              <form onSubmit={handlePostComment} className="mb-4 shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add comment..."
                    required
                    className="flex-1 bg-white border border-slate-200 focus:border-violet-500 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs outline-none transition-all text-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    disabled={savingComment}
                    className="px-3.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors active:scale-95 shrink-0"
                  >
                    Post
                  </button>
                </div>
              </form>

              {/* Comments Feed List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {loadingComments ? (
                  <div className="flex flex-col gap-2.5 items-center justify-center py-8 text-slate-400">
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-violet-500 rounded-full animate-spin" />
                    <span className="text-[10px]">Loading comments...</span>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-8">
                    No comments yet. Write the first one!
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 p-3 rounded-2xl shadow-sm text-left animate-fade-in"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
                          {c.user?.name}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}
                        </span>
                        <span className="text-[8px] bg-slate-100 text-slate-500 dark:bg-slate-800 px-1 py-0.2 rounded capitalize scale-95">
                          {c.user?.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 break-words leading-relaxed">
                        {c.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
