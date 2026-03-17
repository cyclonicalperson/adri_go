import { Pipe, PipeTransform } from '@angular/core';
import { User } from '../models/user.model';

@Pipe({ name: 'adminCount', standalone: true })
export class AdminCountPipe implements PipeTransform {
  transform(users: User[]): number {
    return users.filter(u => u.role === 'Admin').length;
  }
}
