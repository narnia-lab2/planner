import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { TaskInput } from './components/TaskInput';
import { TaskList } from './components/TaskList';
import { StatsBanner } from './components/StatsBanner';
import { Task, Priority } from './types';
import {
  loadTasksFromStorage,
  saveTasksToStorage,
  generateTaskId,
} from './utils/storage';
import { AlertCircle, RotateCcw, X, CheckCircle2 } from 'lucide-react';

export default function App() {
  // Load tasks on initial mount. Starts with empty array if nothing saved.
  // Never injects sample data on refresh.
  const [tasks, setTasks] = useState<Task[]>(() => {
    const { tasks: initialTasks } = loadTasksFromStorage();
    return initialTasks;
  });

  const [storageError, setStorageError] = useState<string | null>(null);
  const [deletedTaskToast, setDeletedTaskToast] = useState<{
    task: Task;
    timer: NodeJS.Timeout;
  } | null>(null);

  // Helper to commit tasks to state & localStorage
  const commitTasks = useCallback((updater: (prev: Task[]) => Task[]) => {
    setTasks((prev) => {
      const next = updater(prev);
      const result = saveTasksToStorage(next);
      if (!result.success) {
        setStorageError(result.error || '저장되지 않았습니다.');
      } else {
        setStorageError(null);
      }
      return next;
    });
  }, []);

  // 1. Add Task
  const handleAddTask = (title: string, priority: Priority, dueDate: string | null) => {
    const newTask: Task = {
      id: generateTaskId(),
      title,
      priority,
      dueDate,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    commitTasks((prev) => [newTask, ...prev]);
  };

  // 2. Toggle Task Complete
  const handleToggleComplete = (id: string) => {
    commitTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const willComplete = !t.completed;
          return {
            ...t,
            completed: willComplete,
            completedAt: willComplete ? new Date().toISOString() : null,
          };
        }
        return t;
      })
    );
  };

  // 3. Delete Task (선택한 항목만 삭제, with undo support)
  const handleDeleteTask = (id: string) => {
    const taskToDelete = tasks.find((t) => t.id === id);
    if (!taskToDelete) return;

    // Clear any previous undo toast timer
    if (deletedTaskToast) {
      clearTimeout(deletedTaskToast.timer);
    }

    // Set new undo toast for 6 seconds
    const timer = setTimeout(() => {
      setDeletedTaskToast(null);
    }, 6000);

    setDeletedTaskToast({
      task: taskToDelete,
      timer,
    });

    // Remove task from state & storage immediately
    commitTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Undo delete
  const handleUndoDelete = () => {
    if (!deletedTaskToast) return;
    clearTimeout(deletedTaskToast.timer);
    const restored = deletedTaskToast.task;

    commitTasks((prev) => [restored, ...prev]);
    setDeletedTaskToast(null);
  };

  // 4. Update Task (title, priority, due date)
  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    commitTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  // Cleanup undo timer on unmount
  useEffect(() => {
    return () => {
      if (deletedTaskToast) {
        clearTimeout(deletedTaskToast.timer);
      }
    };
  }, [deletedTaskToast]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* App Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* Storage Failure Banner (Required: 저장 실패를 감지하면 ‘저장되지 않았습니다’ 안내를 표시) */}
        {storageError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <strong className="font-semibold block sm:inline">저장되지 않았습니다.</strong>{' '}
                <span className="text-sm text-rose-700">{storageError}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStorageError(null)}
              className="text-rose-500 hover:text-rose-800 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Task Input Card (Separated from list) */}
        <TaskInput onAddTask={handleAddTask} />

        {/* Stats Summary (Shown when tasks exist) */}
        <StatsBanner tasks={tasks} />

        {/* Task List Section */}
        <TaskList
          tasks={tasks}
          onToggleComplete={handleToggleComplete}
          onDelete={handleDeleteTask}
          onUpdateTask={handleUpdateTask}
        />
      </main>

      {/* Floating Undo Toast when task is deleted */}
      {deletedTaskToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 text-white rounded-xl shadow-lg border border-slate-700 p-3.5 flex items-center justify-between gap-3 animate-slideUp">
          <div className="text-xs sm:text-sm truncate">
            <span className="font-medium text-slate-300">업무가 삭제되었습니다: </span>
            <span className="text-white font-semibold">
              &quot;{deletedTaskToast.task.title}&quot;
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleUndoDelete}
              className="px-2.5 py-1 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:bg-slate-800 rounded-lg transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>실행 취소</span>
            </button>
            <button
              type="button"
              onClick={() => {
                clearTimeout(deletedTaskToast.timer);
                setDeletedTaskToast(null);
              }}
              className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>내 업무 플래너 &copy; {new Date().getFullYear()}</span>
          <span className="text-slate-400">
            데이터는 브라우저 내부(localStorage)에 안전하게 보관됩니다.
          </span>
        </div>
      </footer>
    </div>
  );
}
