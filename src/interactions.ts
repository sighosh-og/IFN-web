// Light vanilla wiring that brings the captured (static) noon markup back to life.
// Everything is event-delegated on document so it keeps working if a section is re-rendered.
// Returns a cleanup for React's effect.

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T & HTMLElement>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T & HTMLElement>(sel));
const cls = (el: Element, prefix: string) => Array.from(el.classList).find((c) => c.startsWith(prefix));

export function wireInteractions() {
  const offs: Array<() => void> = [];
  const on = (target: EventTarget, type: string, fn: (e: any) => void, opts?: AddEventListenerOptions | boolean) => {
    target.addEventListener(type, fn, opts);
    offs.push(() => target.removeEventListener(type, fn, opts));
  };

  // ---- Links go nowhere in the prototype ----
  on(document, 'click', (e: MouseEvent) => {
    if ((e.target as Element).closest('a')) e.preventDefault();
  }, true);

  // ---- Image gallery: thumbnails drive the main slider ----
  const gallery = $('[data-pdp-gallery]');
  if (gallery) {
    const thumbs = $$('[class*=_thumbnailElement_]', gallery);
    const track = $('[class*=_sliderInnerCtr_]', gallery);
    const activeCls = thumbs.map((t) => cls(t, '_active_')).find(Boolean) ?? '_active_135hb_252';
    const show = (i: number) => {
      thumbs.forEach((t, j) => t.classList.toggle(activeCls, i === j));
      if (track) {
        const w = (track.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
        track.style.transition = 'transform .3s ease';
        track.style.transform = `translate3d(${-i * w}px, 0px, 0px)`;
      }
    };
    thumbs.forEach((t, i) => {
      on(t, 'click', () => show(i));
      on(t, 'mouseenter', () => show(i));
    });
  }

  // ---- Photos inside the captured review cards open the image view on that photo ----
  on(document, 'click', (e: MouseEvent) => {
    const img = (e.target as Element).closest('#ReviewArea img') as HTMLImageElement | null;
    if (!img || img.closest('.cp') || !/\/review\//.test(img.src)) return;
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('pdp:open-photo', { detail: { src: img.src } }));
  });

  // ---- Generic translate-based sliders (recommendations, customer photos) ----
  const slide = (track: HTMLElement, dir: 1 | -1, prev?: HTMLButtonElement | null, next?: HTMLButtonElement | null) => {
    const viewport = track.parentElement!;
    const max = Math.max(0, track.scrollWidth - viewport.clientWidth);
    const cur = Number(track.dataset.offset ?? 0);
    const nextOffset = Math.min(max, Math.max(0, cur + dir * viewport.clientWidth));
    track.dataset.offset = String(nextOffset);
    track.style.transition = 'transform .45s cubic-bezier(.25,.8,.25,1)';
    track.style.transform = `translate3d(${-nextOffset}px, 0px, 0px)`;
    if (prev) prev.disabled = nextOffset <= 0;
    if (next) next.disabled = nextOffset >= max;
  };
  on(document, 'click', (e: MouseEvent) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>(
      '.embla__button, [class*=_swiperButtonPrev_], [class*=_swiperButtonNext_]',
    );
    if (!btn) return;
    const isPrev = btn.matches('.embla__button--prev, [class*=_swiperButtonPrev_]');
    // nearest ancestor that holds both the buttons and the track
    let scope: HTMLElement | null = btn.parentElement;
    let track: HTMLElement | null = null;
    while (scope && !(track = $('[class*=_emblaContainer_], [class*=_imagesContainer_dm7bz]', scope))) scope = scope.parentElement;
    if (!track || !scope) return;
    const prev = $<HTMLButtonElement>('.embla__button--prev, [class*=_swiperButtonPrev_]', scope);
    const next = $<HTMLButtonElement>('.embla__button--next, [class*=_swiperButtonNext_]', scope);
    slide(track, isPrev ? -1 : 1, prev, next);
  });

  // ---- "Read more" in Product Overview (description, highlights, specifications) ----
  on(document, 'click', (e: MouseEvent) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('button[class*=_toggleButton_][aria-controls]');
    if (!btn) return;
    const region = document.getElementById(btn.getAttribute('aria-controls')!) ?? btn.parentElement!;
    const collapsible = [region, ...$$('[class*=_collapsed_], [data-collapsed-class]', region)].filter(
      (el) => cls(el, '_collapsed_') || el.dataset.collapsedClass,
    );
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    collapsible.forEach((el) => {
      const c = el.dataset.collapsedClass ?? cls(el, '_collapsed_')!;
      el.dataset.collapsedClass = c;
      el.classList.toggle(c, expanded);
    });
    $$('[class*=_fade_]', region).forEach((f) => (f.style.display = expanded ? '' : 'none'));
    btn.setAttribute('aria-expanded', String(!expanded));
    const label = $('span', btn);
    if (label) label.textContent = expanded ? 'Read more' : 'Read less';
    const icon = $<HTMLImageElement>('img', btn);
    if (icon) icon.style.transform = expanded ? '' : 'rotate(45deg)';
  });

  // ---- Sticky bottom bar + scroll-to-top button ----
  const bar = $('[class*=_stickyBottomBarContainer_]');
  const topBtn = $('[class*=_scrollTopButtonCtr_]');
  const atc = $('[class*=_secondaryDetails_] [class*=_atcButton_]') ?? $('[class*=_secondaryDetails_] button');
  const onScroll = () => {
    const pastAtc = atc ? atc.getBoundingClientRect().bottom < 0 : window.scrollY > 900;
    bar?.classList.toggle('_visible_o1ozr_17', pastAtc);
    topBtn?.classList.toggle('_isVisible_qmh9y_17', window.scrollY > 900);
  };
  on(window, 'scroll', onScroll, { passive: true });
  onScroll();
  if (topBtn) on(topBtn, 'click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  return () => offs.forEach((f) => f());
}
