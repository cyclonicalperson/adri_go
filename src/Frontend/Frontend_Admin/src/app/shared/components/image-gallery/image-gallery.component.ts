import { Component, Input, OnChanges } from '@angular/core';
import { Media } from '@core/models/destination.model';

@Component({
  selector: 'app-image-gallery',
  standalone: true,
  imports: [],
  templateUrl: './image-gallery.component.html',
  styleUrl: './image-gallery.component.scss',
})

export class ImageGalleryComponent implements OnChanges {
  @Input() media: Media[] = [];
  @Input() fallback = 'assets/images/placeholder.png';

  active = 0;
  lightboxOpen = false;

  private prevMediaUrls: string[] = [];

  ngOnChanges(): void {
    const newUrls = this.media.map(m => m.url);
    const same = newUrls.length === this.prevMediaUrls.length &&
      newUrls.every((u, i) => u === this.prevMediaUrls[i]);
    if (!same) {
      this.active = 0;
      this.prevMediaUrls = newUrls;
    }
  }

  get current(): Media | null {
    return this.media[this.active] ?? null;
  }

  select(index: number): void {
    this.active = index;
  }

  prev(): void {
    this.active = (this.active - 1 + this.media.length) % this.media.length;
  }

  next(): void {
    this.active = (this.active + 1) % this.media.length;
  }

  openLightbox(): void {
    this.lightboxOpen = true;
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).src = this.fallback;
  }

  /** Vraća true samo za http/https/data URLs - lokalni pathovi se ne mogu prikazati */
  isValidUrl(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
  }
}
