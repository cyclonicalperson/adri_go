import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { TruncatePipe } from './pipes/truncate.pipe';
import { DistancePipe } from './pipes/distance.pipe';
import { DateLocalPipe } from './pipes/date-local.pipe';
import { LazyImageDirective } from './directives/lazy-image.directive';
import { HasRoleDirective } from './directives/has-role.directive';

import { MapComponent } from './components/map/map.component';
import { StarRatingComponent } from './components/star-rating/star-rating.component';
import { ImageGalleryComponent } from './components/image-gallery/image-gallery.component';
import { PropertyCardComponent } from './components/property-card/property-card.component';
import { ReviewCardComponent } from './components/review-card/review-card.component';
import { SearchBarComponent } from './components/search-bar/search-bar.component';
import { FilterPanelComponent } from './components/filter-panel/filter-panel.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { PaginationComponent } from './components/pagination/pagination.component';
import { BadgeComponent } from './components/badge/badge.component';

const SHARED = [
  TruncatePipe,
  DistancePipe,
  DateLocalPipe,
  LazyImageDirective,
  HasRoleDirective,
  MapComponent,
  StarRatingComponent,
  ImageGalleryComponent,
  PropertyCardComponent,
  ReviewCardComponent,
  SearchBarComponent,
  FilterPanelComponent,
  ConfirmDialogComponent,
  LoadingSpinnerComponent,
  PaginationComponent,
  BadgeComponent,
];

@NgModule({
  imports: [CommonModule, RouterModule, ...SHARED],
  exports: [CommonModule, RouterModule, ...SHARED],
})
export class SharedModule { }
