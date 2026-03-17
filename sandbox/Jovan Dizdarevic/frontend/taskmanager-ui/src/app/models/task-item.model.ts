export type TaskStatus = 'Todo' | 'InProgress' | 'Done';

export interface TaskItem {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAtUtc: string;
  dueDateUtc?: string | null;
}

export interface CreateTaskItem {
  title: string;
  description?: string;
  status: TaskStatus;
  dueDateUtc?: string | null;
}
