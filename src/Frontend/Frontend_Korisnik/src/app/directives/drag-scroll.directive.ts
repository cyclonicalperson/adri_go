import {
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  Renderer2,
} from '@angular/core';

/**
 * DragScrollDirective
 *
 * axis="x"        → drags the element horizontally (scrollLeft)
 * axis="y-window" → drags the WINDOW vertically (window.scrollBy)
 *
 * Use axis="x" on .horizontal-scroll rows.
 * Use axis="y-window" on the outermost host element so the directive
 * captures mousedown there but scrolls window — this works even when
 * the page scroll container is the browser viewport, not a div.
 */
@Directive({
  selector: '[appDragScroll]',
  standalone: true,
})
export class DragScrollDirective implements OnInit, OnDestroy {
  @Input() axis: 'x' | 'y-window' = 'x';

  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private scrollStartLeft = 0;
  private scrollStartTop  = 0;

  private readonly DRAG_THRESHOLD = 4;
  private hasMoved = false;

  // velocity for momentum
  private velX = 0;
  private velY = 0;
  private lastX = 0;
  private lastY = 0;
  private lastT = 0;
  private rafId: number | null = null;

  private unlisten: (() => void)[] = [];

  constructor(private el: ElementRef<HTMLElement>, private renderer: Renderer2) {}

  ngOnInit(): void {
    const host = this.el.nativeElement;

    // Prevent text-selection while dragging
    this.renderer.setStyle(host, 'user-select', 'none');
    this.renderer.setStyle(host, '-webkit-user-select', 'none');

    const onDown  = (e: MouseEvent) => this.onDown(e);
    const onMove  = (e: MouseEvent) => this.onMove(e);
    const onUp    = (e: MouseEvent) => this.onUp(e);

    host.addEventListener('mousedown', onDown);
    // move + up must be on document so fast moves don't lose the drag
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);

    this.unlisten.push(
      () => host.removeEventListener('mousedown', onDown),
      () => document.removeEventListener('mousemove', onMove),
      () => document.removeEventListener('mouseup',   onUp),
    );
  }

  ngOnDestroy(): void {
    this.unlisten.forEach(fn => fn());
    this.stopMomentum();
  }

  // ── helpers ───────────────────────────────────────────────────

  private get scrollEl(): HTMLElement {
    return this.el.nativeElement;
  }

  private currentScrollTop(): number {
    return this.axis === 'y-window' ? window.scrollY : this.scrollEl.scrollTop;
  }

  private currentScrollLeft(): number {
    return this.scrollEl.scrollLeft;
  }

  private scrollBy(dx: number, dy: number): void {
    if (this.axis === 'x') {
      this.scrollEl.scrollLeft -= dx;
    } else {
      window.scrollBy({ top: -dy, behavior: 'instant' as ScrollBehavior });
    }
  }

  private scrollTo(left: number, top: number): void {
    if (this.axis === 'x') {
      this.scrollEl.scrollLeft = left;
    } else {
      window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
    }
  }

  // ── event handlers ────────────────────────────────────────────

  private onDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    // Don't intercept clicks on buttons, links, inputs, etc.
    const t = e.target as HTMLElement;
    if (t.closest('button, a, input, textarea, select, label, [role="button"]')) return;

    this.stopMomentum();
    this.isDragging = true;
    this.hasMoved   = false;

    this.startX = e.clientX;
    this.startY = e.clientY;
    this.scrollStartLeft = this.currentScrollLeft();
    this.scrollStartTop  = this.currentScrollTop();

    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.lastT = performance.now();
    this.velX  = 0;
    this.velY  = 0;

    this.renderer.setStyle(this.scrollEl, 'cursor', 'grabbing');
    e.preventDefault();
  }

  private onMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;

    if (!this.hasMoved &&
        Math.abs(dx) < this.DRAG_THRESHOLD &&
        Math.abs(dy) < this.DRAG_THRESHOLD) return;

    this.hasMoved = true;

    if (this.axis === 'x') {
      this.scrollEl.scrollLeft = this.scrollStartLeft - dx;
    } else {
      window.scrollTo({ top: this.scrollStartTop - dy, behavior: 'instant' as ScrollBehavior });
    }

    // track velocity
    const now = performance.now();
    const dt  = now - this.lastT;
    if (dt > 0) {
      this.velX = (e.clientX - this.lastX) / dt;
      this.velY = (e.clientY - this.lastY) / dt;
    }
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.lastT = now;

    e.preventDefault();
  }

  private onUp(_e: MouseEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.renderer.setStyle(this.scrollEl, 'cursor', '');

    if (this.hasMoved) {
      this.startMomentum();
      // suppress the next click so cards don't open after drag
      const block = (ev: Event) => {
        ev.stopPropagation();
        ev.preventDefault();
        document.removeEventListener('click', block, true);
      };
      document.addEventListener('click', block, true);
    }
  }

  // ── momentum ──────────────────────────────────────────────────

  private startMomentum(): void {
    const FRICTION = 0.90;
    const STOP     = 0.04; // px/ms

    let vx = -this.velX;
    let vy = -this.velY;

    const step = () => {
      vx *= FRICTION;
      vy *= FRICTION;

      if (this.axis === 'x') {
        this.scrollEl.scrollLeft += vx;
      } else {
        window.scrollBy({ top: vy, behavior: 'instant' as ScrollBehavior });
      }

      const still = this.axis === 'x'
        ? Math.abs(vx) < STOP
        : Math.abs(vy) < STOP;

      if (still) { this.rafId = null; return; }
      this.rafId = requestAnimationFrame(step);
    };

    this.rafId = requestAnimationFrame(step);
  }

  private stopMomentum(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}