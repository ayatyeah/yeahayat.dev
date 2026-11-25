import { useEffect, useRef } from 'react';
import { getVisualScrollY, subscribeVisualScroll } from '../hooks/useScrollFeel';

// Sixteen photographic frames share one WebP. Scrolling backwards retraces the wave.
export default function Waterline() {
  const surface = useRef<HTMLDivElement>(null);
  const film = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = surface.current!;
    const canvas = film.current!;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;

    const atlas = new Image();
    atlas.decoding = 'async';
    let context: CanvasRenderingContext2D | null = null;
    let near = false;
    let top = 0;
    let height = 0;
    let last = -1;
    let loaded = false;

    function paint() {
      if (!near || !loaded || motion.matches || document.hidden || !context) return;
      const viewport = document.documentElement.clientHeight;
      const progress = (getVisualScrollY() + viewport * .94 - top) / (viewport * .85 + height);
      const frame = Math.round(Math.max(0, Math.min(1, progress)) * 15 * 24) / 24;
      if (frame === last) return;
      last = frame;
      const first = Math.floor(frame);
      const width = canvas.width, h = canvas.height;
      function draw(index: number, alpha: number) {
        context!.globalAlpha = alpha;
        context!.drawImage(atlas, (index % 4) * width, Math.floor(index / 4) * h, width, h, 0, 0, width, h);
      }
      draw(first, 1);
      if (frame > first) draw(first + 1, frame - first);
      canvas.hidden = false;
    }
    function measure() {
      const box = host.getBoundingClientRect();
      top = box.top + window.scrollY;
      height = box.height;
      paint();
    }
    function update() {
      if (motion.matches) { canvas.hidden = true; last = -1; return; }
      if (!near) return;
      if (!atlas.src) atlas.src = '/environment/meniscus-frames.webp';
      measure();
    }
    atlas.onload = () => {
      canvas.width = atlas.naturalWidth / 4;
      canvas.height = atlas.naturalHeight / 4;
      context = canvas.getContext('2d', {alpha:false});
      loaded = true;
      update();
    };
    const observer = new IntersectionObserver(([entry]) => {
      near = entry.isIntersecting;
      update();
    }, {rootMargin: '160px 0px'});
    observer.observe(host);
    const size = new ResizeObserver(measure);
    size.observe(document.documentElement);
    size.observe(host);
    const stop = subscribeVisualScroll(paint);
    motion.addEventListener('change',update);
    document.addEventListener('visibilitychange',update);
    return () => {
      atlas.onload = null;
      observer.disconnect();
      size.disconnect();
      stop();
      motion.removeEventListener('change',update);
      document.removeEventListener('visibilitychange',update);
    };
  }, []);

  return <div className="archive-waterline" ref={surface} aria-hidden="true">
    <img src="/environment/meniscus.webp" alt="" width="1344" height="576" loading="lazy" decoding="async" />
    <canvas ref={film} hidden />
  </div>;
}
