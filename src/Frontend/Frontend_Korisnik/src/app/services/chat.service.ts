import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { SiteTranslateService } from './site-translate.service';

export type MessageRole = 'user' | 'model';
export type MessageStatus = 'sending' | 'done' | 'error';
export type ChatCardType = 'post' | 'route' | 'activity';

export interface ChatCard {
  id: number;
  type: ChatCardType | string;
  title: string;
  postType?: string | null;
  regionName?: string | null;
  rating?: number | null;
  avgRating?: number | null;
  reviewCount?: number | null;
  reviews?: number | null;
  imageUrl?: string | null;
  detailUrl?: string | null;
  mapUrl?: string | null;
  distanceKm?: number | null;
  durationMinutes?: number | null;
  difficulty?: string | null;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  timestamp: Date;
  cards?: ChatCard[];
  locationCards?: any[];
  routeCards?: any[];
  activityLocationCards?: any[];
}

interface GeminiChatRequest {
  message: string;
  history: GeminiHistoryMessage[];
  language?: string;
}

interface GeminiHistoryMessage {
  role: 'user' | 'model';
  text: string;
}

interface GeminiChatResponse {
  reply: string;
  toolsUsed: string[];
  referencedPosts?: ChatPostReference[];
  cards?: ChatCard[];
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
  cards: ChatCard[];
}

const MAX_HISTORY = 20;
const MAX_CARDS = 6;

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly chatApiUrl = environment.chatApiUrl;

  private readonly _messages = signal<ChatMessage[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly messages = this._messages.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
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

    const assistantMsg = this.addMessage('model', '', 'sending');
    this._isLoading.set(true);

    try {
      const reply = await this.callChatApi(text);
      this.updateMessage(assistantMsg.id, reply.content, 'done', reply.cards);
    } catch (err) {
      const message = this.extractErrorMessage(err);
      this._error.set(message);
      this.updateMessage(assistantMsg.id, `Greska: ${message}`, 'error');
    } finally {
      this._isLoading.set(false);
    }
  }

  clearChat(): void {
    this._messages.set([]);
    this._error.set(null);
  }

  private async callChatApi(userMessage: string): Promise<AssistantReply> {
    const body: GeminiChatRequest = {
      message: userMessage,
      history: this.buildHistory(),
      language: this.auth.currentTourist?.language || this.translate.currentLanguage,
    };

    const response = await firstValueFrom(
      this.http.post<GeminiChatResponse>(this.chatApiUrl, body),
    );

    if (!response?.reply) {
      throw new Error('Server nije vratio odgovor.');
    }

    const cards = this.normalizeCards(
      Array.isArray(response.cards)
        ? response.cards
        : this.cardsFromReferencedPosts(response.referencedPosts ?? []),
    );

    let replyText = response.reply;
    if (cards.length > 0 && this.isGenericErrorReply(replyText)) {
      replyText = 'Evo sta sam pronasao za vas:';
    }

    return { content: replyText, cards };
  }

  private normalizeCards(cards: ChatCard[]): ChatCard[] {
    const seen = new Set<string>();

    return cards
      .map(card => ({
        ...card,
        id: Number(card.id),
        type: card.type || 'post',
        title: card.title || '',
      }))
      .filter(card =>
        Number.isFinite(card.id) &&
        card.id > 0 &&
        card.title.trim().length > 0 &&
        this.isSupportedCardType(card.type) &&
        !this.wasSeen(seen, `${card.type}:${card.id}`),
      )
      .slice(0, MAX_CARDS);
  }

  private cardsFromReferencedPosts(references: ChatPostReference[]): ChatCard[] {
    const seen = new Set<number>();

    return references
      .map(ref => ({ ...ref, id: Number(ref.id) }))
      .filter(ref =>
        Number.isFinite(ref.id) &&
        ref.id > 0 &&
        ref.title?.trim().length > 0 &&
        !this.wasSeen(seen, ref.id),
      )
      .slice(0, MAX_CARDS)
      .map(ref => ({
        id: ref.id,
        type: 'post',
        title: ref.title,
        postType: ref.postType ?? '',
        regionName: ref.regionName ?? null,
        rating: ref.rating ?? null,
        reviewCount: ref.reviewCount ?? null,
        detailUrl: `/location-details/${ref.id}`,
      }));
  }

  private isSupportedCardType(type: string): boolean {
    return type === 'post' || type === 'route' || type === 'activity';
  }

  private wasSeen<T>(seen: Set<T>, key: T): boolean {
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  }

  private buildHistory(): GeminiHistoryMessage[] {
    return this._messages()
      .filter(m => m.status === 'done' && m.content.trim().length > 0)
      .slice(-MAX_HISTORY)
      .map(m => ({
        role: m.role as 'user' | 'model',
        text: m.content,
      }));
  }

  private addMessage(role: MessageRole, content: string, status: MessageStatus): ChatMessage {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
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
    cards: ChatCard[] = [],
  ): void {
    const legacyCards = this.toLegacyCardBuckets(cards);
    this._messages.update(msgs =>
      msgs.map(m => m.id === id
        ? { ...m, content, status, cards, ...legacyCards }
        : m),
    );
  }

  private toLegacyCardBuckets(cards: ChatCard[]): {
    locationCards: any[];
    routeCards: any[];
    activityLocationCards: any[];
  } {
    return {
      locationCards: cards
        .filter(card => card.type === 'post')
        .map(card => ({
          id: card.id,
          title: card.title,
          postType: card.postType ?? '',
          regionName: card.regionName ?? undefined,
          imageUrl: card.imageUrl ?? undefined,
          rating: card.rating ?? undefined,
          avgRating: card.rating ?? undefined,
          reviewCount: card.reviewCount ?? 0,
          reviews: card.reviewCount ?? 0,
          status: 'published',
        })),
      routeCards: cards
        .filter(card => card.type === 'route')
        .map(card => ({
          id: card.id,
          name: card.title,
          difficulty: card.difficulty ?? '',
          distanceKm: Number(card.distanceKm ?? 0),
          durationMin: Number(card.durationMinutes ?? 0),
          regionName: card.regionName ?? null,
          images: card.imageUrl ? [card.imageUrl] : [],
          waypoints: [],
        })),
      activityLocationCards: cards
        .filter(card => card.type === 'activity')
        .map(card => ({
          id: card.id,
          title: card.title,
          postType: card.postType ?? 'activity',
          regionName: card.regionName ?? undefined,
          imageUrl: card.imageUrl ?? undefined,
          rating: card.rating ?? undefined,
          avgRating: card.rating ?? undefined,
          reviewCount: card.reviewCount ?? 0,
          reviews: card.reviewCount ?? 0,
          status: 'published',
        })),
    };
  }

  private isGenericErrorReply(reply: string): boolean {
    const lower = reply.toLowerCase();
    return (
      lower.includes('nisam mogao da generisem') ||
      lower.includes('zahtev je previse slozen') ||
      lower.includes('nije mogao da generise') ||
      lower.includes('izvinite, zahtev') ||
      lower.includes('zao mi je, nisam')
    );
  }

  private extractErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (typeof err.error?.detail === 'string') return err.error.detail;
      if (typeof err.error?.title === 'string') return err.error.title;
      if (typeof err.error?.error === 'string') return err.error.error;
      if (err.status === 0) return 'Server nije dostupan. Proverite vezu i API adresu.';
      if (err.status === 429) return 'AI kvota je trenutno potrosena. Pokusajte ponovo za minut.';
      return `Server je vratio gresku ${err.status}.`;
    }
    if (err instanceof Error) return err.message;
    return 'Neocekivana greska. Pokusajte ponovo.';
  }
}
