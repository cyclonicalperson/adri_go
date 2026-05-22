import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { SiteTranslateService } from './site-translate.service';

// ── Modeli poruka ─────────────────────────────────────────────────────────────

export type MessageRole   = 'user' | 'model';
export type MessageStatus = 'sending' | 'done' | 'error';

export interface ChatMessage {
  id:        string;
  role:      MessageRole;
  content:   string;
  status:    MessageStatus;
  timestamp: Date;
}

/** Format koji backend prima: POST /api/chat */
interface GeminiChatRequest {
  message: string;
  history: GeminiHistoryMessage[];
  language?: string;
}

/** Format poruke u historiji koji backend (GeminiChatService) razume */
interface GeminiHistoryMessage {
  role: 'user' | 'model';
  text: string;
}

/** Format odgovora koji backend vraća */
interface GeminiChatResponse {
  reply:     string;
  toolsUsed: string[];
}

const MAX_HISTORY = 20; // maksimalan broj poruka u historiji koja se šalje

// ── Servis ────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ChatService {
  // URL ka našem .NET /api/chat endpointu — NE direktno ka Gemini API-ju
  private readonly chatApiUrl = environment.chatApiUrl;

  private readonly _messages  = signal<ChatMessage[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error     = signal<string | null>(null);

  readonly messages    = this._messages.asReadonly();
  readonly isLoading   = this._isLoading.asReadonly();
  readonly error       = this._error.asReadonly();
  readonly hasMessages = computed(() => this._messages().length > 0);

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
    private readonly translate: SiteTranslateService,
  ) {}

  async sendMessage(userText: string): Promise<void> {
    const text = userText.trim();
    if (!text || this._isLoading()) return;

    this._error.set(null);
    this.addMessage('user', text, 'done');

    // Prikazujemo "thinking" bubble odmah
    const assistantMsg = this.addMessage('model', '', 'sending');
    this._isLoading.set(true);

    try {
      const reply = await this.callChatApi(text);
      this.updateMessage(assistantMsg.id, reply, 'done');
    } catch (err) {
      const message = this.extractErrorMessage(err);
      this._error.set(message);
      this.updateMessage(assistantMsg.id, `Greška: ${message}`, 'error');
    } finally {
      this._isLoading.set(false);
    }
  }

  clearChat(): void {
    this._messages.set([]);
    this._error.set(null);
  }

  // ── HTTP poziv ka .NET backendu ───────────────────────────────────────────

  private async callChatApi(userMessage: string): Promise<string> {
    const body: GeminiChatRequest = {
      message: userMessage,
      history: this.buildHistory(),
      language: this.auth.currentTourist?.language || this.translate.currentLanguage,
    };

    // HttpClient automatski dodaje Authorization header kroz auth.interceptor.ts
    // — nema potrebe za ručnim postavljanjem tokena ovde.
    const response = await firstValueFrom(
      this.http.post<GeminiChatResponse>(this.chatApiUrl, body)
    );

    if (!response?.reply) {
      throw new Error('Server nije vratio odgovor.');
    }

    return response.reply;
  }

  // ── Gradnja historije za backend ──────────────────────────────────────────

  /**
   * Uzima poslednih MAX_HISTORY ZAVRŠENIH poruka i mapira ih u format
   * koji naš GeminiChatService na backendu očekuje: { role, text }.
   *
   * Isključujemo trenutnu "sending" poruku asistenta i sve error poruke.
   */
  private buildHistory(): GeminiHistoryMessage[] {
    return this._messages()
      .filter(m => m.status === 'done' && m.content.trim().length > 0)
      .slice(-MAX_HISTORY)
      .map(m => ({
        role: m.role,  // 'user' | 'model' — direktno kompatibilno sa Gemini
        text: m.content,
      }));
  }

  // ── Pomoćne metode ────────────────────────────────────────────────────────

  private addMessage(role: MessageRole, content: string, status: MessageStatus): ChatMessage {
    const msg: ChatMessage = {
      id:        crypto.randomUUID(),
      role,
      content,
      status,
      timestamp: new Date(),
    };
    this._messages.update(msgs => [...msgs, msg]);
    return msg;
  }

  private updateMessage(id: string, content: string, status: MessageStatus): void {
    this._messages.update(msgs =>
      msgs.map(m => m.id === id ? { ...m, content, status } : m),
    );
  }

  private extractErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (typeof err.error?.detail === 'string') return err.error.detail;
      if (typeof err.error?.title === 'string') return err.error.title;
      if (typeof err.error?.error === 'string') return err.error.error;
      if (err.status === 0) return 'Server nije dostupan. Proverite vezu i API adresu.';
      if (err.status === 429) return 'Gemini kvota je trenutno potrošena. Pokušajte ponovo kasnije.';
      return `Server je vratio grešku ${err.status}.`;
    }

    if (err instanceof Error) return err.message;
    return 'Neočekivana greška. Pokušajte ponovo.';
  }
}
