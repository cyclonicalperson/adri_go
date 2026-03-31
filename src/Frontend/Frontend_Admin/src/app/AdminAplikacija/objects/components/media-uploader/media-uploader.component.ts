import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { MediaUploadService } from '@core/services/media-upload.service';
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

  constructor(private uploadService: MediaUploadService) { }

  ngOnInit(): void { }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.uploading = true;
    this.progress = 0;
    this.error = null;

    this.uploadService.upload(this.entityType, this.entityId, file).subscribe({
      next: ev => {
        if (ev.type === HttpEventType.UploadProgress && ev.total) {
          this.progress = Math.round(100 * ev.loaded / ev.total);
        }
        if (ev.type === HttpEventType.Response) {
          const newMedia = [...this.media, ev.body!.data];
          this.mediaChange.emit(newMedia);
          this.uploading = false;
        }
      },
      error: err => {
        this.error = err.message;
        this.uploading = false;
      },
    });
  }

  remove(mediaId: number): void {
    this.uploadService.delete(mediaId).subscribe(() => {
      this.mediaChange.emit(this.media.filter(m => m.mediaId !== mediaId));
    });
  }
}
