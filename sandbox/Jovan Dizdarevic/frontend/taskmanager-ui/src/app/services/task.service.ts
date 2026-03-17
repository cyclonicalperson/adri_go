import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateTaskItem, TaskItem, TaskStatus } from '../models/task-item.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5000/api/tasks';

  getAll(status?: TaskStatus | ''): Observable<TaskItem[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<TaskItem[]>(this.baseUrl, { params });
  }

  create(payload: CreateTaskItem): Observable<TaskItem> {
    return this.http.post<TaskItem>(this.baseUrl, payload);
  }

  update(id: number, payload: CreateTaskItem): Observable<TaskItem> {
    return this.http.put<TaskItem>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
