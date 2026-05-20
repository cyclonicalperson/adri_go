import {
  Component, OnInit, AfterViewChecked,
  ViewChild, ElementRef, computed,
  ChangeDetectorRef, inject, Input, Output, EventEmitter
} from '@angular/core';
import { CommonModule }          from '@angular/common';
import { FormsModule }           from '@angular/forms';
import { Router }                from '@angular/router';
import { ChatService, ChatMessage } from '../services/chat.service';
import { AuthService }           from '../services/auth.service';

@Component({
  selector:    'app-chat-popup',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './chat-popup.component.html',
  styleUrls:   ['./chat-popup.component.css'],
})
export class ChatPopupComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesEnd') private messagesEnd!: ElementRef<HTMLDivElement>;
  @ViewChild('inputField')  private inputField!:  ElementRef<HTMLTextAreaElement>;

  @Input()  isOpen = false;
  @Output() closePopup = new EventEmitter<void>();

  inputText      = '';
  private shouldScroll = false;
  private readonly chat = inject(ChatService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly messages    = this.chat.messages;
  readonly isLoading   = this.chat.isLoading;
  readonly error       = this.chat.error;
  readonly hasMessages = this.chat.hasMessages;

  readonly isLoggedIn  = computed(() => this.auth.isLoggedIn);
  readonly touristName = computed(() => this.auth.currentTourist?.name ?? null);

  readonly suggestions = [
    'Šta da posetim u Budvi?',
    'Preporuči mi hiking rute za početnike',
    'Koji su popularni restorani u Kotoru?',
    'Šta je novo u Durmitoru?',
  ];

  ngOnInit(): void {}

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  onClose(): void {
    this.closePopup.emit();
  }

  async send(): Promise<void> {
    const text = this.inputText.trim();
    if (!text || this.isLoading()) return;

    this.inputText = '';
    this.shouldScroll = true;
    this.cdr.detectChanges();
    this.autoResize();

    await this.chat.sendMessage(text);
    this.shouldScroll = true;
    this.cdr.detectChanges();
  }

  async sendSuggestion(text: string): Promise<void> {
    if (this.isLoading()) return;
    this.inputText = text;
    await this.send();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.send();
    }
  }

  clearChat(): void {
    this.chat.clearChat();
    this.cdr.detectChanges();
    setTimeout(() => this.inputField?.nativeElement.focus(), 50);
  }

  goToLogin(): void { this.router.navigate(['/login']); }

  autoResize(): void {
    const el = this.inputField?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  trackById(_: number, msg: ChatMessage): string { return msg.id; }

  isUserMessage(msg: ChatMessage): boolean     { return msg.role === 'user'; }
  isErrorMessage(msg: ChatMessage): boolean    { return msg.status === 'error'; }
  isThinkingMessage(msg: ChatMessage): boolean { return msg.status === 'sending'; }

  formatContent(content: string): string {
    if (!content) return '';
    let html = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    html = html
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,          '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="numbered">$2</li>');
    html = html.replace(/(<li class="numbered">.*<\/li>\n?)+/g,
      m => `<ol>${m.replace(/\n/g,'')}</ol>`);
    html = html.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>(?!class).*<\/li>\n?)+/g,
      m => `<ul>${m.replace(/\n/g,'')}</ul>`);
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/(<br>){2,}/g, '<br><br>');
    return html;
  }

  private scrollToBottom(): void {
    try {
      this.messagesEnd?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } catch {}
  }
}
