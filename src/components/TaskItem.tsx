import React, { useState } from 'react';
import {
  Check,
  Trash2,
  Calendar,
  AlertTriangle,
  Clock,
  Edit3,
  X,
  Save,
  CheckCircle,
} from 'lucide-react';
import { Task, Priority } from '../types';
import { PriorityBadge, PRIORITY_CONFIG } from './PriorityBadge';
import { formatDueDateDisplay, getDueDateBadgeInfo, getTaskStatus } from '../utils/date';

interface TaskItemProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleComplete,
  onDelete,
  onUpdateTask,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editPriority, setEditPriority] = useState<Priority>(task.priority);
  const [editDueDate, setEditDueDate] = useState<string>(task.dueDate || '');
  const [editError, setEditError] = useState<string | null>(null);

  const status = getTaskStatus(task);
  const badgeInfo = getDueDateBadgeInfo(task);

  const handleStartEdit = () => {
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate || '');
    setEditError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditError(null);
  };

  const handleSaveEdit = () => {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setEditError('업무명을 입력해주세요. 공백만으로는 등록할 수 없습니다.');
      return;
    }

    onUpdateTask(task.id, {
      title: trimmed,
      priority: editPriority,
      dueDate: editDueDate || null,
    });
    setIsEditing(false);
  };

  return (
    <div
      className={`group relative bg-white rounded-xl border transition-all duration-200 ${
        task.completed
          ? 'border-slate-200 bg-slate-50/50 shadow-none'
          : status === 'overdue'
          ? 'border-rose-200 shadow-xs hover:border-rose-300 hover:shadow-sm'
          : status === 'due_today'
          ? 'border-amber-200 shadow-xs hover:border-amber-300 hover:shadow-sm'
          : 'border-slate-200 shadow-xs hover:border-blue-200 hover:shadow-sm'
      }`}
    >
      {/* Edit Mode View */}
      {isEditing ? (
        <div className="p-4 sm:p-5">
          <div className="mb-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              업무명 수정
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => {
                setEditTitle(e.target.value);
                if (editError && e.target.value.trim()) setEditError(null);
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
              autoFocus
            />
            {editError && (
              <p className="text-xs text-rose-600 font-medium mt-1">{editError}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {/* Priority Edit */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-1">우선순위</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['high', 'medium', 'low'] as Priority[]).map((p) => {
                  const cfg = PRIORITY_CONFIG[p];
                  const isSel = editPriority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditPriority(p)}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 cursor-pointer ${
                        isSel
                          ? cfg.activeRing
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Due Date Edit */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-700">마감일</span>
                {editDueDate && (
                  <button
                    type="button"
                    onClick={() => setEditDueDate('')}
                    className="text-[11px] text-slate-400 hover:text-slate-700 underline cursor-pointer"
                  >
                    마감일 제거
                  </button>
                )}
              </div>
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-100 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="px-4 py-1.5 text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>저장</span>
            </button>
          </div>
        </div>
      ) : (
        /* Regular Display Mode */
        <div className="p-3.5 sm:p-4 flex items-start gap-3 sm:gap-4">
          {/* Checkbox Button */}
          <button
            type="button"
            onClick={() => onToggleComplete(task.id)}
            aria-label={task.completed ? '완료 취소' : '업무 완료'}
            className={`mt-0.5 shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 ${
              task.completed
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                : 'border-slate-300 bg-white hover:border-blue-500 hover:bg-blue-50/50 text-transparent'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
          </button>

          {/* Task Info Body */}
          <div className="flex-1 min-w-0">
            {/* Title & Status Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                onClick={() => onToggleComplete(task.id)}
                className={`text-sm sm:text-base font-medium break-words cursor-pointer select-none transition-colors ${
                  task.completed
                    ? 'line-through text-slate-400'
                    : 'text-slate-900 hover:text-blue-700'
                }`}
              >
                {task.title}
              </span>
            </div>

            {/* Metadata Badges & Due Date */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Priority Badge */}
              <PriorityBadge priority={task.priority} size="sm" />

              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] sm:text-xs font-medium ${badgeInfo.badgeClass}`}
              >
                {status === 'overdue' && <AlertTriangle className="w-3 h-3 shrink-0" />}
                {status === 'due_today' && <Clock className="w-3 h-3 shrink-0" />}
                {status === 'completed' && <CheckCircle className="w-3 h-3 shrink-0" />}
                <span>{badgeInfo.label}</span>
                {badgeInfo.subLabel && (
                  <span className="opacity-75 font-normal">({badgeInfo.subLabel})</span>
                )}
              </span>

              {/* Due Date Display text */}
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span className={status === 'overdue' ? 'font-medium text-rose-700' : ''}>
                  {formatDueDateDisplay(task.dueDate)}
                </span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 shrink-0 self-center sm:self-start">
            {/* Edit Button */}
            <button
              type="button"
              onClick={handleStartEdit}
              title="업무 수정"
              aria-label="업무 수정"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            {/* Delete Button (선택한 항목만 삭제) */}
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              title="업무 삭제"
              aria-label="업무 삭제"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
