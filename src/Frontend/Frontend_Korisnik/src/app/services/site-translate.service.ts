import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

export type SiteLanguageCode = 'en' | 'sr';

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
    { code: 'en', label: 'English', shortLabel: 'EN' },
    { code: 'sr', label: 'Srpski',  shortLabel: 'SR' },
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
    return this.languages.find(l => l.code === this.currentLanguage) ?? this.languages[0];
  }

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.document.documentElement.lang = this.currentLanguage;
    this.startObserver();
    void this.setLanguage(this.currentLanguage, { persist: false });
  }

  async setLanguage(language: SiteLanguageCode, options: { persist?: boolean } = {}): Promise<void> {
    const next = this.isSupported(language) ? language : this.defaultLanguage;
    const dict = next === this.defaultLanguage
      ? {}
      : await this.loadDictionary(next);

    this.dictionary = dict;
    this.normalizedDictionary = this.buildNormalizedDictionary(dict);
    this.language$.next(next);
    this.document.documentElement.lang = next;

    if (options.persist !== false) {
      localStorage.setItem(this.storageKey, next);
    }

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
        Object.entries(file ?? {})
          .filter(([key, val]) => !key.startsWith('__') && typeof val === 'string')
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
    let node: Node | null = walker.nextNode();

    while (node) {
      const textNode = node as Text;
      if (this.shouldTranslateTextNode(textNode)) {
        const current = textNode.textContent ?? '';
        let entry = this.textEntries.get(textNode);

        if (!entry) {
          entry = { original: current, lastApplied: current };
          this.textEntries.set(textNode, entry);
        } else if (current !== entry.lastApplied) {
          entry.original = current;
        }

        const translated = this.translateText(entry.original);
        entry.lastApplied = translated;
        if (current !== translated) textNode.textContent = translated;
      }
      node = walker.nextNode();
    }

    root.querySelectorAll<HTMLElement>('*').forEach(el => {
      if (this.shouldSkipElement(el)) return;
      this.translateElementAttributes(el);
    });
  }

  private translateElementAttributes(element: Element): void {
    const attrs = ['placeholder', 'title', 'aria-label'];
    let entries = this.attributeEntries.get(element);
    if (!entries) {
      entries = new Map<string, AttributeEntry>();
      this.attributeEntries.set(element, entries);
    }

    attrs.forEach(attr => {
      const current = element.getAttribute(attr);
      if (current == null) return;

      let entry = entries!.get(attr);
      if (!entry) {
        entry = { original: current, lastApplied: current };
        entries!.set(attr, entry);
      } else if (current !== entry.lastApplied) {
        entry.original = current;
      }

      const translated = this.translateText(entry.original);
      entry.lastApplied = translated;
      if (current !== translated) element.setAttribute(attr, translated);
    });
  }

  private translateText(text: string): string {
    if (this.currentLanguage === this.defaultLanguage || !text.trim()) return text;

    const translated = this.lookupTranslation(text);
    if (translated) {
      const lead  = text.match(/^\s*/)?.[0] ?? '';
      const trail = text.match(/\s*$/)?.[0] ?? '';
      return `${lead}${translated}${trail}`;
    }

    let partial = text;
    for (const [src, tgt] of Object.entries(this.dictionary).sort((a, b) => b[0].length - a[0].length)) {
      if (!src.trim() || src.startsWith('__') || !partial.includes(src)) continue;
      partial = partial.split(src).join(tgt);
    }
    return partial;
  }

  private shouldTranslateTextNode(node: Text): boolean {
    if (!node.parentElement) return false;
    if (!node.textContent?.trim()) return false;
    return !this.shouldSkipElement(node.parentElement);
  }

  private shouldSkipElement(el: Element): boolean {
    if (el.closest('[data-no-translate="true"]')) return true;
    const tag = el.tagName.toLowerCase();
    return ['script', 'style', 'code', 'pre'].includes(tag);
  }

  private lookupTranslation(text: string): string | undefined {
    const candidates = Array.from(new Set([
      text,
      text.trim(),
      text.trim().replace(/\s+/g, ' '),
    ].filter(Boolean)));

    for (const c of candidates) {
      if (this.dictionary[c]) return this.dictionary[c];
    }
    for (const c of candidates) {
      const norm = this.normalizedDictionary[this.normalizeKey(c)];
      if (norm) return norm;
    }
    return undefined;
  }

  private buildNormalizedDictionary(dict: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(dict).map(([k, v]) => [this.normalizeKey(k), v])
    );
  }

  private normalizeKey(text: string): string {
    return text.trim()
      .replace(/ /g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  private loadStoredLanguage(): SiteLanguageCode {
    const stored = localStorage.getItem(this.storageKey);
    return this.isSupported(stored) ? stored : this.defaultLanguage;
  }

  private isSupported(lang: string | null): lang is SiteLanguageCode {
    return this.languages.some(l => l.code === lang);
  }
}
