export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  dueDate: string | null; // YYYY-MM-DD
  completed: boolean;
  createdAt: string; // ISO date string
  completedAt: string | null;
}

export type TaskStatus = 'overdue' | 'due_today' | 'upcoming' | 'no_due_date' | 'completed';

export type FilterStatus = 'all' | 'active' | 'today' | 'overdue' | 'completed';

export type SortOption = 'dueDateAsc' | 'dueDateDesc' | 'priorityDesc' | 'createdDesc';
