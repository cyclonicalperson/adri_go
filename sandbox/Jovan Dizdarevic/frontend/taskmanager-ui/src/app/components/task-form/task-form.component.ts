import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateTaskItem, TaskItem, TaskStatus } from '../../models/task-item.model';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-form.component.html',
  styleUrl: './task-form.component.css'
})
export class TaskFormComponent {
  @Input() set editTask(value: TaskItem | null) {
    this._editTask = value;
    if (value) {
      this.form.patchValue({
        title: value.title,
        description: value.description ?? '',
        status: value.status,
        dueDateUtc: value.dueDateUtc ? value.dueDateUtc.substring(0, 10) : ''
      });
    } else {
      this.form.reset({ status: 'Todo', dueDateUtc: '' });
    }
  }
  get editTask(): TaskItem | null { return this._editTask; }

  @Output() save = new EventEmitter<CreateTaskItem>();
  @Output() cancel = new EventEmitter<void>();

  private _editTask: TaskItem | null = null;
  readonly statuses: TaskStatus[] = ['Todo', 'InProgress', 'Done'];

  readonly form = new FormBuilder().nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(500)]],
    status: ['Todo' as TaskStatus, Validators.required],
    dueDateUtc: ['']
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.save.emit({
      title: value.title,
      description: value.description || undefined,
      status: value.status,
      dueDateUtc: value.dueDateUtc ? new Date(value.dueDateUtc).toISOString() : null
    });

    if (!this.editTask) {
      this.form.reset({ status: 'Todo', dueDateUtc: '' });
    }
  }
}
