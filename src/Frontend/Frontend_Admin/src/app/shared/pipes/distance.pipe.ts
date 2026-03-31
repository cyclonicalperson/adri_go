import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'distance', standalone: true })
export class DistancePipe implements PipeTransform {
  transform(meters: number): string {
    if (meters == null) return '';
    return meters >= 1000
      ? (meters / 1000).toFixed(1) + ' km'
      : Math.round(meters) + ' m';
  }
}
