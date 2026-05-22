import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Location, LocationService } from './location.service';

// ── Modeli poruka ─────────────────────────────────────────────────────────────

export type MessageRole   = 'user' | 'model';
export type MessageStatus = 'sending' | 'done' | 'error';

export interface ChatMessage {
  id:        string;
  role:      MessageRole;
  content:   string;
  status:    MessageStatus;
  timestamp: Date;
  locationCards?: Location[];
}

/** Format koji backend prima: POST /api/chat */
interface GeminiChatRequest {
  message: string;
  history: GeminiHistoryMessage[];
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
  referencedPosts?: ChatPostReference[];
}

interface ChatPostReference {
  id: number;
  title: string;
  postType?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  regionName?: string | null;
}

interface AssistantReply {
  content: string;
  locationCards: Location[];
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
    private readonly locationService: LocationService,
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
      this.updateMessage(assistantMsg.id, reply.content, 'done', reply.locationCards);
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

  private async callChatApi(userMessage: string): Promise<AssistantReply> {
    const body: GeminiChatRequest = {
      message: userMessage,
      history: this.buildHistory(),
    };

    // HttpClient automatski dodaje Authorization header kroz auth.interceptor.ts
    // — nema potrebe za ručnim postavljanjem tokena ovde.
    const response = await firstValueFrom(
      this.http.post<GeminiChatResponse>(this.chatApiUrl, body)
    );

    if (!response?.reply) {
      throw new Error('Server nije vratio odgovor.');
    }

    return {
      content: response.reply,
      locationCards: await this.hydrateReferencedPosts(response.referencedPosts ?? []),
    };
  }

  private async hydrateReferencedPosts(references: ChatPostReference[]): Promise<Location[]> {
    const uniqueIds = Array.from(new Set(
      references
        .map(ref => Number(ref.id))
        .filter(id => Number.isFinite(id) && id > 0)
    )).slice(0, 4);

    const locations: Location[] = [];
    for (const id of uniqueIds) {
      try {
        locations.push(await firstValueFrom(this.locationService.getLocationById(id)));
      } catch {
        const fallback = references.find(ref => Number(ref.id) === id);
        if (fallback) locations.push(this.referenceToLocation(fallback));
      }
    }

    return locations;
  }

  private referenceToLocation(reference: ChatPostReference): Location {
    return {
      id: Number(reference.id),
      adminId: 0,
      adminName: '',
      title: reference.title,
      postType: reference.postType ?? '',
      regionName: reference.regionName ?? undefined,
      status: 'published',
      viewCount: 0,
      likeCount: 0,
      saveCount: 0,
      reviewCount: reference.reviewCount ?? 0,
      avgRating: reference.rating ?? undefined,
      createdAt: '',
      updatedAt: '',
    };
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

  private updateMessage(
    id: string,
    content: string,
    status: MessageStatus,
    locationCards: Location[] = []
  ): void {
    this._messages.update(msgs =>
      msgs.map(m => m.id === id ? { ...m, content, status, locationCards } : m),
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
