import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ImageUploadService {
  private readonly base = `${environment.apiUrl}/images`;

  constructor(private http: HttpClient) {}

  /** Upload jedne slike — vraća Cloudinary URL */
  uploadOne(file: File): Observable<string> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>(`${this.base}/upload`, form).pipe(
      map(res => res.url),
    );
  }

  /** Upload više slika odjednom (max 10) — vraća niz Cloudinary URL-ova */
  uploadMultiple(files: File[]): Observable<string[]> {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    return this.http.post<{ urls: string[] }>(`${this.base}/upload/multiple`, form).pipe(
      map(res => res.urls),
    );
  }
}
