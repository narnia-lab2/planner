import { Task } from '../types';

const STORAGE_KEY = 'my_work_planner_tasks_v1';

export interface StorageResult {
  success: boolean;
  error?: string;
}

/**
 * Load tasks from localStorage.
 * Always returns empty array if nothing is saved or if storage is corrupted.
 * Does NOT inject fake/sample data on refresh!
 */
export function loadTasksFromStorage(): { tasks: Task[]; loadError?: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { tasks: [] };
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Validate structure minimal checks
      const validTasks: Task[] = parsed.filter(
        (t) => t && typeof t.id === 'string' && typeof t.title === 'string'
      );
      return { tasks: validTasks };
    }
    return { tasks: [] };
  } catch (error) {
    console.error('Failed to load tasks from localStorage', error);
    return { tasks: [], loadError: '기존 데이터를 불러오는 중 오류가 발생했습니다.' };
  }
}

/**
 * Save tasks into localStorage.
 * Detects storage failure (QuotaExceeded, private browsing blocking, etc.)
 */
export function saveTasksToStorage(tasks: Task[]): StorageResult {
  try {
    const serialized = JSON.stringify(tasks);
    localStorage.setItem(STORAGE_KEY, serialized);
    return { success: true };
  } catch (error) {
    console.error('Failed to save tasks to localStorage', error);
    return {
      success: false,
      error: '저장되지 않았습니다. 브라우저 저장 공간이 부족하거나 저장이 차단되어 있을 수 있습니다.',
    };
  }
}

/**
 * Generate a unique ID for each task
 */
export function generateTaskId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
