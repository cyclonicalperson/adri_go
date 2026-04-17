import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Media } from '@core/models/destination.model';

@Component({
  selector: 'app-media-uploader',
  standalone: true,
  templateUrl: './media-uploader.component.html',
  styleUrl: './media-uploader.component.scss',
})

export class MediaUploaderComponent implements OnInit {
  @Input() entityType!: 'destination' | 'object' | 'event';
  @Input() entityId!: number;
  @Input() media: Media[] = [];
  @Output() mediaChange = new EventEmitter<Media[]>();

  uploading = false;
  progress = 0;
  error: string | null = null;

  constructor() { }

  ngOnInit(): void { }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.uploading = true;
    this.progress = 0;
    this.error = null;

    const reader = new FileReader();
    reader.onload = () => {
      const newItem: Media = {
        mediaId: Date.now(),
        url: String(reader.result ?? ''),
        sortOrder: this.media.length,
      };
      this.progress = 100;
      this.mediaChange.emit([...this.media, newItem]);
      this.uploading = false;
    };
    reader.onerror = () => {
      this.error = 'Greška pri učitavanju slike.';
      this.uploading = false;
    };
    reader.readAsDataURL(file);
  }

  remove(mediaId: number): void {
    this.mediaChange.emit(this.media.filter(m => m.mediaId !== mediaId));
  }
}
