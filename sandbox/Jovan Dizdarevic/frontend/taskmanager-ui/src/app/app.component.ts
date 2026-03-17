import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskFormComponent } from './components/task-form/task-form.component';
import { TaskListComponent } from './components/task-list/task-list.component';
import { CreateTaskItem, TaskItem, TaskStatus } from './models/task-item.model';
import { TaskService } from './services/task.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskFormComponent, TaskListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private readonly taskService = inject(TaskService);

  tasks: TaskItem[] = [];
  selectedStatus: TaskStatus | '' = '';
  editingTask: TaskItem | null = null;
  statuses: Array<TaskStatus | ''> = ['', 'Todo', 'InProgress', 'Done'];

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.taskService.getAll(this.selectedStatus).subscribe({
      next: tasks => this.tasks = tasks
    });
  }

  onSave(payload: CreateTaskItem): void {
    const request$ = this.editingTask
      ? this.taskService.update(this.editingTask.id, payload)
      : this.taskService.create(payload);

    request$.subscribe({
      next: () => {
        this.editingTask = null;
        this.loadTasks();
      }
    });
  }

  onEdit(task: TaskItem): void {
    this.editingTask = task;
  }

  onCancelEdit(): void {
    this.editingTask = null;
  }

  onDelete(id: number): void {
    this.taskService.delete(id).subscribe({
      next: () => {
        if (this.editingTask?.id === id) {
          this.editingTask = null;
        }
        this.loadTasks();
      }
    });
  }
}
