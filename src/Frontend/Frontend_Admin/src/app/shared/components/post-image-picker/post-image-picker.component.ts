import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, ElementRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImageUploadService } from '@core/services/image-upload.service';

interface PickerItem {
  url: string;
  uploading?: boolean;
  error?: string;
}

@Component({
  selector: 'app-post-image-picker',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './post-image-picker.component.html',
  styleUrl: './post-image-picker.component.scss',
})
export class PostImagePickerComponent implements OnChanges {
  @Input() images: string[] = [];
  @Output() imagesChange = new EventEmitter<string[]>();

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  items: PickerItem[] = [];
  urlInput = '';
  urlError = '';
  dragOver = false;
  globalError = '';

  constructor(private uploadSvc: ImageUploadService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['images']) {
      const incoming = this.images ?? [];
      const current = this.items.filter(i => !i.uploading).map(i => i.url);
      const same = incoming.length === current.length && incoming.every((u, i) => u === current[i]);
      if (!same) {
        this.items = incoming.map(url => ({ url }));
      }
    }
  }

  // ── File input ────────────────────────────────────────────────────────────

  openFilePicker(): void {
    this.fileInputRef.nativeElement.value = '';
    this.fileInputRef.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.uploadFiles(Array.from(input.files));
    }
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(): void {
    this.dragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    const files = Array.from(event.dataTransfer?.files ?? []).filter(f => f.type.startsWith('image/'));
    if (files.length) this.uploadFiles(files);
  }

  // ── URL input ─────────────────────────────────────────────────────────────

  addFromUrl(): void {
    this.urlError = '';
    const url = this.urlInput.trim();
    if (!url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      this.urlError = 'URL mora početi sa http:// ili https://';
      return;
    }
    if (this.items.some(i => i.url === url)) {
      this.urlError = 'Ta slika je već dodata.';
      return;
    }

    this.items = [...this.items, { url }];
    this.urlInput = '';
    this.emit();
  }

  onUrlKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addFromUrl();
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  remove(index: number): void {
    this.items = this.items.filter((_, i) => i !== index);
    this.emit();
  }

  // ── Reorder ───────────────────────────────────────────────────────────────

  moveLeft(index: number): void {
    if (index === 0) return;
    const copy = [...this.items];
    [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
    this.items = copy;
    this.emit();
  }

  moveRight(index: number): void {
    if (index >= this.items.length - 1) return;
    const copy = [...this.items];
    [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
    this.items = copy;
    this.emit();
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private uploadFiles(files: File[]): void {
    this.globalError = '';
    const MAX = 10;
    const allowed = files.slice(0, MAX);

    allowed.forEach(file => {
      if (!file.type.startsWith('image/')) return;

      const placeholder: PickerItem = { url: '', uploading: true };
      this.items = [...this.items, placeholder];
      const idx = this.items.length - 1;

      this.uploadSvc.uploadOne(file).subscribe({
        next: url => {
          this.items = this.items.map((item, i) => i === idx ? { url } : item);
          this.emit();
        },
        error: () => {
          this.items = this.items.map((item, i) =>
            i === idx ? { url: '', uploading: false, error: `Greška pri uploadu: ${file.name}` } : item,
          );
        },
      });
    });
  }

  private emit(): void {
    const urls = this.items.filter(i => i.url && !i.uploading).map(i => i.url);
    this.imagesChange.emit(urls);
  }

  get isValidUrl(): boolean {
    const u = this.urlInput.trim();
    return u.startsWith('http://') || u.startsWith('https://');
  }
}
