import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Media } from '../models/destination.model';

@Injectable({ providedIn: 'root' })
export class MediaUploadService {
  private readonly url = `${environment.apiUrl}/media`;

  constructor(private http: HttpClient) { }

  upload(
    entityType: 'destination' | 'object' | 'event',
    entityId: number,
    file: File,
    caption?: string,
  ): Observable<HttpEvent<ApiResponse<Media>>> {
    const form = new FormData();
    form.append('file', file);
    form.append('entityType', entityType);
    form.append('entityId', String(entityId));
    if (caption) form.append('caption', caption);

    const req = new HttpRequest('POST', this.url, form, {
      reportProgress: true,
    });

    return this.http.request<ApiResponse<Media>>(req);
  }

  delete(mediaId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.url}/${mediaId}`);
  }

  reorder(
    entityType: 'destination' | 'object' | 'event',
    entityId: number,
    orderedIds: number[],
  ): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.url}/reorder`, {
      entityType,
      entityId,
      orderedIds,
    });
  }
}
