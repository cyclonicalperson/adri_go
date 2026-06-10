import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

export type SiteLanguageCode = 'en' | 'sr' | 'de' | 'it' | 'fr' | 'ru' | 'es' | 'nl';

export interface SiteLanguageOption {
  code: SiteLanguageCode;
  label: string;
  shortLabel: string;
}

interface TextEntry {
  original: string;
  lastApplied: string;
}

interface AttributeEntry {
  original: string;
  lastApplied: string;
}

@Injectable({ providedIn: 'root' })
export class SiteTranslateService implements OnDestroy {
  readonly languages: SiteLanguageOption[] = [
    { code: 'en', label: 'English',    shortLabel: 'EN' },
    { code: 'sr', label: 'Srpski',     shortLabel: 'SR' },
    { code: 'de', label: 'Deutsch',    shortLabel: 'DE' },
    { code: 'it', label: 'Italiano',   shortLabel: 'IT' },
    { code: 'fr', label: 'Français',   shortLabel: 'FR' },
    { code: 'ru', label: 'Русский',    shortLabel: 'RU' },
    { code: 'es', label: 'Español',    shortLabel: 'ES' },
    { code: 'nl', label: 'Nederlands', shortLabel: 'NL' },
  ];

  readonly language$ = new BehaviorSubject<SiteLanguageCode>(this.loadStoredLanguage());

  private readonly storageKey = 'adrigo_user_language';
  private readonly defaultLanguage: SiteLanguageCode = 'en';
  private readonly textEntries = new WeakMap<Text, TextEntry>();
  private readonly attributeEntries = new WeakMap<Element, Map<string, AttributeEntry>>();

  private dictionary: Record<string, string> = {};
  private normalizedDictionary: Record<string, string> = {};
  private observer: MutationObserver | null = null;
  private initialized = false;
  private applyQueued = false;

  constructor(
    private http: HttpClient,
    @Inject(DOCUMENT) private document: Document,
    private zone: NgZone,
  ) {}

  get currentLanguage(): SiteLanguageCode {
    return this.language$.value;
  }

  get currentLanguageOption(): SiteLanguageOption {
    return this.languages.find(language => language.code === this.currentLanguage) ?? this.languages[0];
  }

  instant(text: string | null | undefined): string {
    if (!text) return text ?? '';
    return this.translateText(text);
  }

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.document.documentElement.lang = this.currentLanguage;
    this.startObserver();
    void this.setLanguage(this.currentLanguage, { persist: false });
  }

  async setLanguage(language: SiteLanguageCode, options: { persist?: boolean } = {}): Promise<void> {
    const nextLanguage = this.isSupported(language) ? language : this.defaultLanguage;

    // Update UI state synchronously before the async dictionary fetch so that
    // Angular's change detection (triggered by the same click event) picks up
    // the new language immediately — the active pill updates without needing a
    // second interaction.
    this.language$.next(nextLanguage);
    this.document.documentElement.lang = nextLanguage;
    if (options.persist !== false) {
      localStorage.setItem(this.storageKey, nextLanguage);
    }

    const dictionary = nextLanguage === this.defaultLanguage
      ? {}
      : await this.loadDictionary(nextLanguage);

    this.dictionary = dictionary;
    this.normalizedDictionary = this.buildNormalizedDictionary(dictionary);
    this.queueApply();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private async loadDictionary(language: SiteLanguageCode): Promise<Record<string, string>> {
    try {
      const file = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`assets/i18n/${language}.json`)
      );
      return Object.fromEntries(
        Object.entries(file ?? {}).filter(([key, value]) => !key.startsWith('__') && typeof value === 'string')
      ) as Record<string, string>;
    } catch {
      return {};
    }
  }

  private startObserver(): void {
    this.zone.runOutsideAngular(() => {
      if (!this.document.body) return;
      this.observer = new MutationObserver(() => this.queueApply());
      this.observer.observe(this.document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['placeholder', 'title', 'aria-label'],
      });
    });
  }

  private queueApply(): void {
    if (this.applyQueued) return;
    this.applyQueued = true;
    this.zone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        this.applyQueued = false;
        this.applyTranslations();
      });
    });
  }

  private applyTranslations(): void {
    const root = this.document.body;
    if (!root) return;

    const walker = this.document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let currentNode: Node | null = walker.nextNode();

    while (currentNode) {
      const textNode = currentNode as Text;
      if (this.shouldTranslateTextNode(textNode)) {
        const currentValue = textNode.textContent ?? '';
        let entry = this.textEntries.get(textNode);

        if (!entry) {
          entry = { original: currentValue, lastApplied: currentValue };
          this.textEntries.set(textNode, entry);
        } else if (currentValue !== entry.lastApplied) {
          entry.original = currentValue;
        }

        const translated = this.translateText(entry.original);
        entry.lastApplied = translated;
        if (currentValue !== translated) textNode.textContent = translated;
      }
      currentNode = walker.nextNode();
    }

    root.querySelectorAll<HTMLElement>('*').forEach(element => {
      if (this.shouldSkipElement(element)) return;
      this.translateElementAttributes(element);
    });
  }

  private translateElementAttributes(element: Element): void {
    const attributes = ['placeholder', 'title', 'aria-label'];
    let entries = this.attributeEntries.get(element);
    if (!entries) {
      entries = new Map<string, AttributeEntry>();
      this.attributeEntries.set(element, entries);
    }

    attributes.forEach(attribute => {
      const currentValue = element.getAttribute(attribute);
      if (currentValue == null) return;

      let entry = entries!.get(attribute);
      if (!entry) {
        entry = { original: currentValue, lastApplied: currentValue };
        entries!.set(attribute, entry);
      } else if (currentValue !== entry.lastApplied) {
        entry.original = currentValue;
      }

      const translated = this.translateText(entry.original);
      entry.lastApplied = translated;
      if (currentValue !== translated) element.setAttribute(attribute, translated);
    });
  }

  private translateText(text: string): string {
    if (this.currentLanguage === this.defaultLanguage || !text.trim()) return text;

    const translated = this.lookupTranslation(text);
    if (translated) {
      const leadingWhitespace  = text.match(/^\s*/)?.[0]  ?? '';
      const trailingWhitespace = text.match(/\s*$/)?.[0] ?? '';
      return `${leadingWhitespace}${translated}${trailingWhitespace}`;
    }

    let partial = text;
    for (const [source, target] of Object.entries(this.dictionary).sort((a, b) => b[0].length - a[0].length)) {
      if (!source.trim() || source.startsWith('__') || !partial.includes(source)) continue;
      partial = partial.split(source).join(target);
    }
    return partial;
  }

  private shouldTranslateTextNode(node: Text): boolean {
    if (!node.parentElement) return false;
    if (!node.textContent?.trim()) return false;
    return !this.shouldSkipElement(node.parentElement);
  }

  private shouldSkipElement(element: Element): boolean {
    if (element.closest('[data-no-translate="true"]')) return true;
    const tag = element.tagName.toLowerCase();
    return ['script', 'style', 'code', 'pre'].includes(tag);
  }

  private lookupTranslation(text: string): string | undefined {
    const rawCandidates = Array.from(new Set([
      text,
      text.trim(),
      text.trim().replace(/\s+/g, ' '),
    ].filter(candidate => !!candidate)));

    for (const candidate of rawCandidates) {
      const direct = this.dictionary[candidate];
      if (direct) return direct;
    }
    for (const candidate of rawCandidates) {
      const normalized = this.normalizedDictionary[this.normalizeLookupKey(candidate)];
      if (normalized) return normalized;
    }
    return undefined;
  }

  private buildNormalizedDictionary(dictionary: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(dictionary).map(([key, value]) => [this.normalizeLookupKey(key), value])
    );
  }

  private normalizeLookupKey(text: string): string {
    const normalized = text
      .trim()
      .replace(/ /g, ' ')
      .replace(/…/g, '...')
      .replace(/[–—]/g, '-')
      .replace(/[""„]/g, '"')
      .replace(/[''‚]/g, '\'')
      .replace(/→/g, '->')
      .replace(/←/g, '<-')
      .replace(/\s+/g, ' ')
      .toLowerCase();

    return normalized
      .replace(/đ/g, 'dj')
      .replace(/[čć]/g, 'c')
      .replace(/ž/g, 'z')
      .replace(/š/g, 's');
  }

  private loadStoredLanguage(): SiteLanguageCode {
    const storedLanguage = localStorage.getItem(this.storageKey);
    return this.isSupported(storedLanguage) ? storedLanguage : this.defaultLanguage;
  }

  private isSupported(language: string | null): language is SiteLanguageCode {
    return this.languages.some(option => option.code === language);
  }
}
