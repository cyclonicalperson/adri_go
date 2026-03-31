import { Directive, ElementRef, Input, OnInit } from '@angular/core';

@Directive({ selector: 'img[appLazyImage]', standalone: true })
export class LazyImageDirective implements OnInit {
  @Input() appLazyImage!: string;
  @Input() fallback = 'assets/images/placeholder.png';

  constructor(private el: ElementRef<HTMLImageElement>) { }

  ngOnInit(): void {
    const img = this.el.nativeElement;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            img.src = this.appLazyImage;
            img.onerror = () => { img.src = this.fallback; };
            observer.unobserve(img);
          }
        });
      });
      observer.observe(img);
    } else {
      img.src = this.appLazyImage;
    }
  }
}
