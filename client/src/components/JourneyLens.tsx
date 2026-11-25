import { useEffect, useRef } from 'react';
import { getVisualScrollY, subscribeVisualScroll } from '../hooks/useScrollFeel';
import { dropProjection, observeDrop } from '../lib/dropHandoff';
import { paintJourneyLens, paintGlassSlide } from '../lib/paintJourneyLens';

type Station = {
  x: number;
  y: number;
  radius: number;
  warmth: number;
  plate: number;
  sample?: HTMLImageElement;
  u: number;
  v: number;
};
const clamp = (n: number, low = 0, high = 1) => Math.min(high, Math.max(low, n));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);

export default function JourneyLens() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const mainNode = document.querySelector<HTMLElement>('.page-main-home');
    if (!mainNode) return;
    const main = mainNode;
    let width = 0,
      height = 0,
      frame = 0,
      measureFrame = 0;
    let stations: Station[] = [];
    let screen: HTMLImageElement | undefined;
    let screenBounds: DOMRect | undefined;
    let pointer: { x: number; y: number; u: number; v: number } | null = null;
    let hoverAmount = 0,
      hovering = false,
      maxScroll = 0;
    let visible = false;
    let lastDraw = 0;
    let caught = false;
    let textBounds: { left: number; right: number; top: number; bottom: number }[] = [];
    const resize = new ResizeObserver(queueMeasure);
    const observed = new Set<Element>();
    function observe(el: Element) {
      if (!observed.has(el)) {
        resize.observe(el);
        observed.add(el);
      }
    }

    function measure() {
      measureFrame = 0;
      if (motion.matches || document.hidden) return;
      width = document.documentElement.clientWidth;
      height = window.innerHeight;
      if (!width || !height) return;
      const scroll = window.scrollY;
      maxScroll = document.documentElement.scrollHeight - height;
      for (const target of observed)
        if (!target.isConnected) {
          resize.unobserve(target);
          observed.delete(target);
        }
      const small = width <= 760;
      const next: Station[] = [];
      function add(
        selector: string,
        u: number,
        v: number,
        r: number,
        warmth: number,
        imageSelector?: string,
        plate = 0,
      ) {
        const el = document.querySelector(selector);
        if (!el) return;
        observe(el);
        const box = el.getBoundingClientRect();
        if (!box.width || !box.height) return;
        const sample = imageSelector
          ? (document.querySelector<HTMLImageElement>(imageSelector) ?? undefined)
          : undefined;
        next.push({
          x: box.left + box.width * u,
          y: box.top + scroll + box.height * v,
          radius: r * (small ? 0.62 : 1),
          warmth,
          plate,
          sample,
          u,
          v,
        });
      }
      const intro = '.business-intro .scene-art';
      const caseImage = '.archive-entry:not([hidden]) .screen-incoming';
      const cover = '.archive-entry:not([hidden]) .archive-cover';
      screen = document.querySelector<HTMLImageElement>(caseImage) ?? undefined;
      screenBounds = document.querySelector(cover)?.getBoundingClientRect();
      if (screenBounds)
        screenBounds = new DOMRect(
          screenBounds.x,
          screenBounds.y + scroll,
          screenBounds.width,
          screenBounds.height,
        );
      add('.water-track', small ? .89 : .78, 1, 0, 0.03, intro);
      // The optical bench, the selected interface, and the game's light source are physical landmarks.
      add('.business-intro', small ? 0.89 : 0.78, 0.34, small ? 37 : 64, 0.12, intro);
      add('.business-intro', small ? 0.96 : 0.66, 0.87, 14, 0.2, intro);
      add('.workbench-display', 0.78, 0.56, 42, 0.24, '.workbench-preview img', 0.55);
      add('.archive-waterline', 0.72, 0.51, 54, 0.34, '.workbench-preview img', 1);
      add('.case-folio .folio-leaf', 0.5, 0.51, 35, 0.38, '.case-folio img', 1);
      add(cover, 0.73, 0.3, 56, 0.2, caseImage);
      add('.archive-entry:not([hidden]) .archive-heading .water-figure', 0.5, 0.46, 13, 0.12, caseImage);
      add('#water-tools', 0.64, 0.48, 22, 0.27, caseImage);
      add('#stack', small ? 0.965 : 0.84, 0.81, 22, 0.47, caseImage);
      add('.sun-board svg > circle', 0.5, 0.5, 7, 0.99);
      add('.sun-board', 0.782, 0.99, 8, 0.98);
      add('#contact-horizon', 0.8, 0.62, 31, 0.83, '.horizon-lake img');
      add('#contact-horizon', 0.87, 0.96, 0, 1);
      stations = next.sort((a, b) => a.y - b.y).filter((p, i, a) => !i || p.y - a[i - 1].y > 2);
      textBounds = [
        ...main.querySelectorAll(
          'h2,h3,.business-intro p,.archive-index,.sun-copy,.workshop-story p,.workshop-return,.workbench-answer[data-active=true] p,.workbench-options,.horizon-brief',
        ),
      ].flatMap((el) => {
        const b = el.getBoundingClientRect();
        return b.width && b.height
          ? [{ left: b.left, right: b.right, top: b.top + scroll, bottom: b.bottom + scroll }]
          : [];
      });
      schedule();
    }
    function queueMeasure() {
      if (!motion.matches && !document.hidden && !measureFrame) measureFrame = requestAnimationFrame(measure);
    }
    function draw(now: number) {
      frame = 0;
      if (motion.matches || document.hidden || stations.length < 2) {
        canvas.hidden = true;
        visible = false;
        return;
      }
      const scroll = getVisualScrollY();
      const approach = ease(clamp(1 - (maxScroll - scroll) / (height * 0.66)));
      let camera = scroll + height * mix(0.54, 0.94, approach);
      const first = stations[0],
        last = stations[stations.length - 1];
      const drop = dropProjection;
      let handoffAlpha = 1;
      if (drop) {
        first.x=drop.x; first.y=drop.pageY; first.radius=drop.radius;
        const next=stations[1], end=next.y-height*.54;
        if (scroll<=end) {
          const t=clamp((scroll-drop.releaseScroll)/Math.max(1,end-drop.releaseScroll));
          camera=mix(first.y,next.y,t);
          handoffAlpha=drop.blend;
        }
      }
      if (camera < first.y - height * 0.3 || camera > last.y + height * 0.14) {
        canvas.hidden = true;
        visible = false;
        return;
      }
      // The first screen already owns a WebGL surface. Allocate the full-size
      // 2D bitmap only once the travelling lens actually enters the viewport.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.4);
      const bitmapWidth = Math.round(width * dpr), bitmapHeight = Math.round(height * dpr);
      if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
        canvas.width = bitmapWidth;
        canvas.height = bitmapHeight;
        ctx!.setTransform(bitmapWidth / width, 0, 0, bitmapHeight / height, 0, 0);
      }
      canvas.hidden = false;
      const dt = visible ? Math.min(70, now - lastDraw) : 70;
      visible = true;
      lastDraw = now;
      ctx!.clearRect(0, 0, width, height);
      const sceneOpacity = handoffAlpha *
        clamp((camera - first.y + height * 0.3) / (height * 0.23)) *
        clamp((last.y + height * 0.14 - camera) / (height * 0.22));
      // A short wake follows the lens. Its curve has horizontal tangents at the docks.
      let segment = stations.findIndex((s) => s.y >= camera);
      if (segment < 0) segment = stations.length - 1;
      segment = Math.max(1, segment);
      const a = stations[segment - 1],
        b = stations[segment];
      const t = clamp((camera - a.y) / (b.y - a.y));
      const travel = ease(t);
      // Slight deceleration near each station lets the image settle into the glass.
      const y = mix(a.y, b.y, mix(t, travel, 0.34));
      let x = mix(a.x, b.x, travel);
      // In the handoff both canvases are composited against the native
      // viewport, even while the decorative scroll clock is easing.
      let viewY = y - (segment===1 && drop ? window.scrollY : scroll);
      const warm = mix(a.warmth, b.warmth, travel);
      let radius = mix(a.radius, b.radius, travel);
      const light = ctx!.createLinearGradient(0, viewY - height * 0.48, 0, viewY + height * 0.32);
      light.addColorStop(0, 'rgba(121,193,214,0)');
      light.addColorStop(0.46, 'rgba(127,201,219,.20)');
      light.addColorStop(0.6, 'rgba(238,226,184,.58)');
      light.addColorStop(1, 'rgba(146,203,218,0)');
      ctx!.save();
      ctx!.globalAlpha = sceneOpacity;
      ctx!.beginPath();
      let started = false;
      for (let i = 1; i < stations.length; i++) {
        const left = stations[i - 1],
          right = stations[i];
        if (right.y < scroll || left.y > scroll + height) continue;
        const start = left.y - scroll,
          end = right.y - scroll,
          dy = (end - start) / 3;
        if (!started) {
          ctx!.moveTo(left.x, start);
          started = true;
        }
        ctx!.bezierCurveTo(left.x, start + dy, right.x, end - dy, right.x, end);
      }
      ctx!.strokeStyle = light;
      ctx!.lineWidth = 1.15;
      ctx!.stroke();
      ctx!.restore();
      // Only the live cover accepts pointer magnification. A click still opens its gallery.
      const hoverTarget =
        hovering &&
        pointer &&
        screenBounds &&
        Math.abs(camera - screenBounds.y - screenBounds.height * 0.5) < height * 0.8
          ? 1
          : 0;
      hoverAmount = mix(hoverAmount, hoverTarget, 1 - Math.exp(-dt / 60));
      const station = t < 0.5 ? a : b;
      let image = station.sample,
        u = mix(a.u, b.u, travel),
        v = mix(a.v, b.v, travel);
      if (pointer && hoverAmount > 0.005) {
        x = mix(x, pointer.x, hoverAmount);
        viewY = mix(viewY, pointer.y, hoverAmount);
        radius = mix(radius, Math.min(width * 0.075, 72), hoverAmount);
        u = mix(u, pointer.u, hoverAmount);
        v = mix(v, pointer.v, hoverAmount);
        image = screen;
      }
      const clearance = textBounds.reduce((min, box) => {
        const dx = Math.max(box.left - x, 0, x - box.right);
        const dy = Math.max(box.top - viewY - scroll, 0, viewY + scroll - box.bottom);
        return Math.min(min, Math.hypot(dx, dy));
      }, Infinity);
      const ink = hoverTarget ? 1 : mix(0.09, 1, ease(clamp(clearance / Math.max(5, radius))));
      // On the final stretch the drop dissolves into two expanding rings on the lake.
      if (segment === stations.length - 1 && t > 0.04 && t < 1) {
        ctx!.save();
        ctx!.strokeStyle = caught ? '#ffe0a6' : '#bee9fa';
        ctx!.lineWidth = 0.95;
        for (const delay of [0, 0.24]) {
          const wave = clamp((t - delay) / (1 - delay));
          if (!wave) continue;
          const ring = 9 + Math.min(width * 0.16, 125) * ease(wave);
          ctx!.globalAlpha = 0.65 * sceneOpacity * Math.sin(wave * Math.PI);
          ctx!.beginPath();
          ctx!.ellipse(x, viewY, ring, ring * 0.23, -0.11, 0, Math.PI * 2);
          ctx!.stroke();
        }
        ctx!.restore();
      }
      const sampleWidth =
        hoverAmount > 0.01 && screenBounds && screen?.naturalWidth
          ? mix(
              Math.min(screen.naturalWidth, screen.naturalHeight) * 0.33,
              (radius * 2 * screen.naturalWidth) / screenBounds.width / 1.85,
              hoverAmount,
            )
          : undefined;
      const plate = mix(a.plate, b.plate, travel) * (1 - hoverAmount);
      if (plate > .01 && radius > 1)
        paintGlassSlide(ctx!, x, viewY, radius, plate, image, sceneOpacity * ink);
      if (radius > 1 && plate < .99)
        paintJourneyLens(
          ctx!,
          x,
          viewY,
          radius,
          0.18 + (b.x - a.x) / (width * 2),
          warm,
          image?.complete && image.naturalWidth ? image : null,
          u,
          v,
          sceneOpacity * ink * (1 - plate),
          sampleWidth,
        );
      if (Math.abs(hoverAmount - hoverTarget) > 0.01) schedule();
    }
    function schedule() {
      if (frame || motion.matches || document.hidden || !stations.length) return;
      // The long WebGL introduction owns the first several screens.
      if (!visible && !dropProjection && getVisualScrollY() + height < stations[0].y) return;
      frame = requestAnimationFrame(draw);
    }
    function pointerMove(event: PointerEvent) {
      if (
        motion.matches ||
        event.pointerType !== 'mouse' ||
        !screenBounds ||
        !(event.target instanceof Element) ||
        !event.target.closest('.archive-cover')
      ) {
        if (hovering) {
          hovering = false;
          schedule();
        }
        return;
      }
      const rect = screenBounds,
        localY = event.clientY + window.scrollY - rect.y;
      hovering = true;
      pointer = {
        x: event.clientX,
        y: event.clientY,
        u: clamp((event.clientX - rect.x) / rect.width),
        v: clamp(localY / rect.height),
      };
      schedule();
    }
    function clearPointer() {
      hovering = false;
      schedule();
    }
    function updateMode() {
      if (!motion.matches && !document.hidden) {
        queueMeasure();
        return;
      }
      cancelAnimationFrame(frame);
      cancelAnimationFrame(measureFrame);
      frame = 0;
      measureFrame = 0;
      visible = false;
      canvas.hidden = true;
      if (motion.matches) {
        canvas.width = canvas.height = 1;
        stations = [];
      }
    }
    const changes = new MutationObserver((records) => {
      // Waterline's decorative fallback canvas can toggle without moving a dock.
      if (
        records.some(
          (record) => !(record.type === 'attributes' && record.target instanceof HTMLCanvasElement),
        )
      )
        queueMeasure();
    });
    changes.observe(main, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['hidden', 'cy', 'aria-selected', 'data-solved'],
    });
    observe(main);
    // Clear the old moving origin when scrolling back into the first chapters.
    const stopDrop=observeDrop(()=>{
      if (!dropProjection) { queueMeasure(); schedule(); return; }
      if (dropProjection.blend>0 && window.scrollY<=dropProjection.releaseScroll) {
        cancelAnimationFrame(frame);
        draw(performance.now());
      } else schedule();
    });
    const stop = subscribeVisualScroll(schedule);
    function catchLight() {
      caught = true;
      schedule();
    }
    window.addEventListener('portfolio-light-caught', catchLight);
    window.addEventListener('resize', queueMeasure);
    window.addEventListener('pointermove', pointerMove, { passive: true });
    window.addEventListener('pointerout', onExit, { passive: true });
    function onExit(e: PointerEvent) {
      if (!e.relatedTarget) clearPointer();
    }
    document.addEventListener('visibilitychange', updateMode);
    document.fonts.addEventListener('loadingdone', queueMeasure);
    main.addEventListener('load', queueMeasure, true);
    motion.addEventListener('change', updateMode);
    updateMode();
    return () => {
      stop();stopDrop();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(measureFrame);
      changes.disconnect();
      resize.disconnect();
      window.removeEventListener('portfolio-light-caught', catchLight);
      window.removeEventListener('resize', queueMeasure);
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerout', onExit);
      main.removeEventListener('load', queueMeasure, true);
      motion.removeEventListener('change', updateMode);
      document.removeEventListener('visibilitychange', updateMode);
      document.fonts.removeEventListener('loadingdone', queueMeasure);
    };
  }, []);
  return <canvas ref={ref} className="journey-lens" width={1} height={1} aria-hidden="true" hidden />;
}
