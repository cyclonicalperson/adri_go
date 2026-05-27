import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Location, LocationService } from './location.service';
import { TouristRouteItem, TouristRoutesService } from './tourist-routes.service';
import { SiteTranslateService } from './site-translate.service';

// ── Modeli poruka ─────────────────────────────────────────────────────────────

export type MessageRole   = 'user' | 'model';
export type MessageStatus = 'sending' | 'done' | 'error';

export interface ChatMessage {
  id:            string;
  role:          MessageRole;
  content:       string;
  status:        MessageStatus;
  timestamp:     Date;
  locationCards?:         Location[];
  routeCards?:            TouristRouteItem[];
  activityLocationCards?: Location[];
}

/** Format koji Gemini MCP server prima: POST /api/chat */
interface GeminiChatRequest {
  message:   string;
  history:   GeminiHistoryMessage[];
  language?: string;
}

interface GeminiHistoryMessage {
  role: 'user' | 'model';
  text: string;
}

/** Format odgovora koji Gemini MCP server vraca */
interface GeminiChatResponse {
  reply:             string;
  toolsUsed:         string[];
  referencedPosts?:  ChatPostReference[];
}

interface ChatPostReference {
  id:           number;
  title:        string;
  postType?:    string | null;
  rating?:      number | null;
  reviewCount?: number | null;
  regionName?:  string | null;
}

interface AssistantReply {
  content:               string;
  locationCards:         Location[];
  routeCards:            TouristRouteItem[];
  activityLocationCards: Location[];
}

const MAX_HISTORY = 20;

// Kljucne rijeci za detekciju ruta u Gemini odgovoru
const ROUTE_KEYWORDS = [
  'rut', 'route', 'staza', 'trail', 'hiking', 'planinar', 'setnica',
  'bicikl', 'cycling', 'trekking', 'trek', 'pjesack', 'walk', 'maraton',
];

// Kljucne rijeci za detekciju aktivnosti u Gemini odgovoru
const ACTIVITY_KEYWORDS = [
  'aktivnost', 'activity', 'activities', 'rafting', 'zipline', 'kanjoning',
  'paraglajding', 'bungee', 'jedrenje', 'kayak', 'ronjenje', 'diving',
  'skiing', 'skijanje', 'sport', 'adrenalin', 'adventure', 'yoga', 'spa',
  'wellness', 'surfing', 'climbing', 'penjanje',
];

// Poznati nazivi mjesta za ekstrakciju iz Gemini odgovora
const LOCATION_NAMES = [
  'durmitor', 'budva', 'kotor', 'tara', 'ulcinj', 'bar', 'herceg novi',
  'cetinje', 'podgorica', 'kolasin', 'bjelasica', 'prokletije', 'skadar',
  'zabljak', 'petrovac', 'sveti stefan', 'lovcen', 'boka kotorska',
  'crno jezero', 'tara kanjon',
];

// ── Servis ────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ChatService {
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
    private readonly routesService: TouristRoutesService,
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
      this.updateMessage(
        assistantMsg.id, reply.content, 'done',
        reply.locationCards, reply.routeCards, reply.activityLocationCards
      );
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

  // ── HTTP poziv ka Gemini MCP backendu ─────────────────────────────────────

  private async callChatApi(userMessage: string): Promise<AssistantReply> {
    const body: GeminiChatRequest = {
      message:  userMessage,
      history:  this.buildHistory(),
      language: this.auth.currentTourist?.language || this.translate.currentLanguage,
    };

    const response = await firstValueFrom(
      this.http.post<GeminiChatResponse>(this.chatApiUrl, body)
    );

    if (!response?.reply) {
      throw new Error('Server nije vratio odgovor.');
    }

    const toolsUsed = response.toolsUsed ?? [];

    // Gemini vraca referencedPosts za lokacije
    const locationCards = await this.hydrateReferencedPosts(response.referencedPosts ?? []);

    // Analiziramo toolsUsed + tekst za rute i aktivnosti
    const routeCards            = await this.detectAndFetchRouteCards(response.reply, toolsUsed);
    const activityLocationCards = await this.detectAndFetchActivityCards(response.reply, toolsUsed);

    // Ako Gemini nije mogao da generise odgovor ali ima kartica,
    // prikazujemo neutralniju poruku umjesto tehnicke greske
    let replyText = response.reply;
    const hasCards = locationCards.length > 0 || routeCards.length > 0 || activityLocationCards.length > 0;
    if (hasCards && this.isGenericErrorReply(replyText)) {
      replyText = 'Evo sta sam pronasao za vas:';
    }

    return { content: replyText, locationCards, routeCards, activityLocationCards };
  }

  // ── Hydratacija location kartica iz Gemini referencedPosts ───────────────

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

  private referenceToLocation(ref: ChatPostReference): Location {
    return {
      id:          Number(ref.id),
      adminId:     0,
      adminName:   '',
      title:       ref.title,
      postType:    ref.postType ?? '',
      regionName:  ref.regionName ?? undefined,
      status:      'published',
      viewCount:   0,
      likeCount:   0,
      saveCount:   0,
      reviewCount: ref.reviewCount ?? 0,
      avgRating:   ref.rating ?? undefined,
      createdAt:   '',
      updatedAt:   '',
    };
  }

  // ── Detekcija ruta ────────────────────────────────────────────────────────

  private async detectAndFetchRouteCards(
    content: string,
    toolsUsed: string[]
  ): Promise<TouristRouteItem[]> {
    // Primarni signal: Gemini je koristio tourism_search_routes ili tourism_get_route_detail
    const usedRouteTool = toolsUsed.some(t => t.includes('route'));
    const lower = content.toLowerCase();
    const mentionsRoutes = usedRouteTool || ROUTE_KEYWORDS.some(kw => lower.includes(kw));
    if (!mentionsRoutes) return [];

    try {
      // Ako je Gemini koristio alat, trazimo po nazivu mjesta iz teksta
      // Ako nije (keyword match), trazimo po route keywordu
      const keyword = usedRouteTool
        ? this.extractLocationName(content)
        : this.extractKeyword(content, ROUTE_KEYWORDS);

      const routes = await firstValueFrom(
        this.routesService.getRoutes(keyword, 'createdAt', 'desc')
      );
      return routes.slice(0, 3);
    } catch {
      return [];
    }
  }

  // ── Detekcija aktivnosti ──────────────────────────────────────────────────

  private async detectAndFetchActivityCards(
    content: string,
    toolsUsed: string[]
  ): Promise<Location[]> {
    // Primarni signal: Gemini je koristio tourism_search_activities ili tourism_search_posts sa sports_facility
    const usedActivityTool = toolsUsed.some(t =>
      t.includes('activit') || t.includes('search_posts') || t.includes('recommendations')
    );
    const lower = content.toLowerCase();
    const mentionsActivities = usedActivityTool || ACTIVITY_KEYWORDS.some(kw => lower.includes(kw));
    if (!mentionsActivities) return [];

    try {
      const keyword = usedActivityTool
        ? this.extractLocationName(content)
        : this.extractKeyword(content, ACTIVITY_KEYWORDS);

      const res = await firstValueFrom(
        this.locationService.searchLocations(keyword || 'sport', 1, 3, { type: 'sports_facility' })
      );
      if (res.data.length > 0) return res.data.slice(0, 3);

      // Fallback: attraction
      const fallback = await firstValueFrom(
        this.locationService.searchLocations(keyword || 'activity', 1, 3, { type: 'attraction' })
      );
      return fallback.data.slice(0, 3);
    } catch {
      return [];
    }
  }

  /**
   * Iz teksta Gemini odgovora izvlaci naziv poznate lokacije ili regije.
   * Koristimo ovaj pristup kada Gemini vec ima rezultate iz alata,
   * pa keyword detekcija nije pouzdana (tekst sadrzi nazive ruta, ne kljucne rijeci).
   */
  private extractLocationName(content: string): string {
    const lower = content.toLowerCase();
    for (const name of LOCATION_NAMES) {
      if (lower.includes(name)) return name;
    }
    return '';
  }

  /**
   * Iz teksta izvlaci prvu rijec koja se podudara sa listom kljucnih rijeci.
   * Koristimo kada Gemini NIJE koristio alat, pa moramo sami prepoznati temu.
   */
  private extractKeyword(content: string, keywords: string[]): string {
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);

    for (const word of words) {
      if (keywords.some(kw => word.includes(kw) || kw.includes(word))) {
        return word;
      }
    }
    return '';
  }

  // ── Gradnja historije za Gemini ───────────────────────────────────────────

  private buildHistory(): GeminiHistoryMessage[] {
    return this._messages()
      .filter(m => m.status === 'done' && m.content.trim().length > 0)
      .slice(-MAX_HISTORY)
      .map(m => ({
        role: m.role as 'user' | 'model',
        text: m.content,
      }));
  }

  // ── Pomocne metode ────────────────────────────────────────────────────────

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
    locationCards:         Location[]         = [],
    routeCards:            TouristRouteItem[] = [],
    activityLocationCards: Location[]         = []
  ): void {
    this._messages.update(msgs =>
      msgs.map(m => m.id === id
        ? { ...m, content, status, locationCards, routeCards, activityLocationCards }
        : m)
    );
  }

  /**
   * Prepoznaje genericki Gemini error reply koji se pojavljuje kada
   * AI nije mogao da generise odgovor (npr. dostigao MaxToolRounds).
   */
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
      if (typeof err.error?.title  === 'string') return err.error.title;
      if (typeof err.error?.error  === 'string') return err.error.error;
      if (err.status === 0)   return 'Server nije dostupan. Proverite vezu i API adresu.';
      if (err.status === 429) return 'AI kvota je trenutno potrosena. Pokusajte ponovo za minut.';
      return `Server je vratio gresku ${err.status}.`;
    }
    if (err instanceof Error) return err.message;
    return 'Neocekivana greska. Pokusajte ponovo.';
  }
}
