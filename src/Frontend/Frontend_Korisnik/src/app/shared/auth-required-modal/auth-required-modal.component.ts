import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-auth-required-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-required-modal.component.html',
  styleUrls: ['./auth-required-modal.component.css'],
})
export class AuthRequiredModalComponent {
  @Input() title = 'Sign in required';
  @Input() message = 'Create a free account or log in to save places, write reviews, plan trips and more.';
  @Input() cancelLabel = 'Maybe later';
  @Input() loginLabel = 'Log In';

  @Output() closed = new EventEmitter<void>();
  @Output() login = new EventEmitter<void>();
}
