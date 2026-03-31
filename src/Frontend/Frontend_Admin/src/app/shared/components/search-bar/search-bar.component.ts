import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss',
})
export class SearchBarComponent implements OnInit {
  @Input() placeholder = 'Pretraži…';
  @Input() debounce = 350;
  @Output() searched = new EventEmitter<string>();

  query = '';
  term$ = new Subject<string>();

  ngOnInit(): void {
    this.term$.pipe(
      debounceTime(this.debounce),
      distinctUntilChanged(),
    ).subscribe(val => this.searched.emit(val));
  }

  clear(): void {
    this.query = '';
    this.searched.emit('');
  }
}
