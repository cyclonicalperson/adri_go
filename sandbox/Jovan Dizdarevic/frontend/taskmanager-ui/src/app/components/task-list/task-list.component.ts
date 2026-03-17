import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TaskItem } from '../../models/task-item.model';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.css'
})
export class TaskListComponent {
  @Input() tasks: TaskItem[] = [];
  @Output() edit = new EventEmitter<TaskItem>();
  @Output() delete = new EventEmitter<number>();
}
