import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private _count = 0;
  private _loading$ = new BehaviorSubject<boolean>(false);

  loading$ = this._loading$.asObservable();

  show(): void {
    this._count++;
    this._loading$.next(true);
  }

  hide(): void {
    this._count = Math.max(0, this._count - 1);
    if (this._count === 0) {
      this._loading$.next(false);
    }
  }
}
