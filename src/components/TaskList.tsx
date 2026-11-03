import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  Inbox,
  Filter,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Task, FilterStatus, SortOption } from '../types';
import { TaskItem } from './TaskItem';
import { getTaskStatus } from '../utils/date';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleComplete,
  onDelete,
  onUpdateTask,
}) => {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('dueDateAsc');
  const [searchQuery, setSearchQuery] = useState('');

  // Priority weight for sorting (high > medium > low)
  const priorityWeight = {
    high: 3,
    medium: 2,
    low: 1,
  };

  // Counts for filter tabs
  const counts = useMemo(() => {
    return {
      all: tasks.length,
      active: tasks.filter((t) => !t.completed).length,
      today: tasks.filter((t) => !t.completed && getTaskStatus(t) === 'due_today').length,
      overdue: tasks.filter((t) => !t.completed && getTaskStatus(t) === 'overdue').length,
      completed: tasks.filter((t) => t.completed).length,
    };
  }, [tasks]);

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // Filter by tab
    if (filter === 'active') {
      result = result.filter((t) => !t.completed);
    } else if (filter === 'today') {
      result = result.filter((t) => !t.completed && getTaskStatus(t) === 'due_today');
    } else if (filter === 'overdue') {
      result = result.filter((t) => !t.completed && getTaskStatus(t) === 'overdue');
    } else if (filter === 'completed') {
      result = result.filter((t) => t.completed);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q));
    }

    // Sorting
    result.sort((a, b) => {
      // Keep completed items generally at bottom unless completed filter is selected
      if (filter === 'all' && a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      if (sortBy === 'dueDateAsc') {
        // null dueDate goes to bottom
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }

      if (sortBy === 'dueDateDesc') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return b.dueDate.localeCompare(a.dueDate);
      }

      if (sortBy === 'priorityDesc') {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }

      if (sortBy === 'createdDesc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      return 0;
    });

    return result;
  }, [tasks, filter, searchQuery, sortBy]);

  // Total tasks is zero -> initial empty state
  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
          <Inbox className="w-8 h-8 stroke-[1.75]" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1.5">
          등록된 업무가 없습니다
        </h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
          오늘 처리해야 할 일이나 프로젝트 마감 일정을 위 입력창에 등록하고 체계적으로 관리해 보세요.
        </p>
        <div className="inline-flex items-center gap-2 text-xs text-blue-700 bg-blue-50/80 px-3.5 py-1.5 rounded-full border border-blue-200">
          <Clock className="w-3.5 h-3.5" />
          <span>마감일을 지정하면 D-Day와 마감 알림 뱃지가 제공됩니다</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Control Bar: Filters & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>전체</span>
            <span className={`text-xs px-1.5 py-0.2 rounded-full ${filter === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              filter === 'active'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>미완료</span>
            <span className={`text-xs px-1.5 py-0.2 rounded-full ${filter === 'active' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {counts.active}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('today')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              filter === 'today'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>오늘 마감</span>
            {counts.today > 0 && (
              <span className={`text-xs px-1.5 py-0.2 rounded-full ${filter === 'today' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800 font-semibold'}`}>
                {counts.today}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilter('overdue')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              filter === 'overdue'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>기한 지남</span>
            {counts.overdue > 0 && (
              <span className={`text-xs px-1.5 py-0.2 rounded-full ${filter === 'overdue' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800 font-semibold'}`}>
                {counts.overdue}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              filter === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>완료</span>
            <span className={`text-xs px-1.5 py-0.2 rounded-full ${filter === 'completed' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {counts.completed}
            </span>
          </button>
        </div>

        {/* Search & Sort Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="업무 검색..."
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                지우기
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>정렬:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="text-xs sm:text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="dueDateAsc">마감일 빠른 순</option>
              <option value="dueDateDesc">마감일 늦은 순</option>
              <option value="priorityDesc">우선순위 높은 순</option>
              <option value="createdDesc">최근 등록 순</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task Items List */}
      {filteredAndSortedTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
          <p className="text-sm text-slate-500 mb-3">
            {searchQuery
              ? `"${searchQuery}"에 일치하는 업무가 없습니다.`
              : '선택한 탭에 해당하는 업무가 없습니다.'}
          </p>
          {(searchQuery || filter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setFilter('all');
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
            >
              전체 업무 보기로 초기화
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredAndSortedTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggleComplete={onToggleComplete}
              onDelete={onDelete}
              onUpdateTask={onUpdateTask}
            />
          ))}
        </div>
      )}
    </div>
  );
};
