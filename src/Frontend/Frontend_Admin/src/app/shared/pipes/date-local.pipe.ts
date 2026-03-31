import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'dateLocal', standalone: true })
export class DateLocalPipe implements PipeTransform {
  transform(value: string | null, format: 'date' | 'datetime' | 'time' = 'date'): string {
    if (!value) return '';

    const date = new Date(value);
    const locale = 'sr-RS';

    switch (format) {
      case 'datetime':
        return date.toLocaleString(locale, {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });
      case 'time':
        return date.toLocaleTimeString(locale, {
          hour: '2-digit', minute: '2-digit',
        });
      default:
        return date.toLocaleDateString(locale, {
          day: '2-digit', month: '2-digit', year: 'numeric',
        });
    }
  }
}
