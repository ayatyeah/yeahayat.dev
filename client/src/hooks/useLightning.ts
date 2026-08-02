// Молнии на кнопках. Один общий canvas поверх интерфейса рисует процедурные
// разряды по периметру интерактивных элементов:
//   • фоновые искры — раз в пару секунд случайная кнопка коротко «пробивает»;
//   • наведение — дуги непрерывно обегают рамку (+ класс .is-charged для CSS);
//   • нажатие — разряд-вспышка с расходящимися ветками.
// Ломаные строятся midpoint displacement'ом, свет — двумя проходами
// (цветной ореол + белое ядро) в режиме 'lighter'.
// Уважает prefers-reduced-motion (полностью выключается) и не мешает
// кликам (pointer-events: none). Zero dependencies.

import { useEffect } from 'react';

const SELECTOR =
  '.btn, .nav-link, .brand, .project-link, .contact-row, .lightbox-nav, .lightbox-close';

const VOLT = '134, 240, 255'; // электрический циан
const ARC = '154, 128, 255'; // фиолетовая дуга

type Bolt = {
  pts: Array<[number, number]>;
  born: number;
  ttl: number; // мс
  width: number;
  mixArc: number; // 0 = volt, 1 = arc
};

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

// Ломаная между двумя точками: рекурсивное смещение середин.
function jaggedPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  displace: number
): Array<[number, number]> {
  let pts: Array<[number, number]> = [
    [x1, y1],
    [x2, y2]
  ];
  let d = displace;
  while (d > 1.2) {
    const next: Array<[number, number]> = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      const mx = (ax + bx) / 2 + rand(-d, d);
      const my = (ay + by) / 2 + rand(-d, d);
      next.push([mx, my], [bx, by]);
    }
    pts = next;
    d *= 0.52;
  }
  return pts;
}

// Дуга вдоль случайной стороны рамки элемента, чуть снаружи.
function edgeArc(rect: DOMRect): Bolt {
  const edge = Math.floor(Math.random() * 4); // 0 top, 1 right, 2 bottom, 3 left
  const t1 = rand(0.02, 0.55);
  const t2 = Math.min(0.98, t1 + rand(0.3, 0.55));
  const off = rand(2, 6); // отступ наружу
  let x1 = 0;
  let y1 = 0;
  let x2 = 0;
  let y2 = 0;
  if (edge === 0) {
    y1 = y2 = rect.top - off;
    x1 = rect.left + rect.width * t1;
    x2 = rect.left + rect.width * t2;
  } else if (edge === 2) {
    y1 = y2 = rect.bottom + off;
    x1 = rect.left + rect.width * t1;
    x2 = rect.left + rect.width * t2;
  } else if (edge === 1) {
    x1 = x2 = rect.right + off;
    y1 = rect.top + rect.height * t1;
    y2 = rect.top + rect.height * t2;
  } else {
    x1 = x2 = rect.left - off;
    y1 = rect.top + rect.height * t1;
    y2 = rect.top + rect.height * t2;
  }
  return {
    pts: jaggedPath(x1, y1, x2, y2, rand(4, 8)),
    born: performance.now(),
    ttl: rand(130, 220),
    width: rand(0.9, 1.5),
    mixArc: Math.random()
  };
}

// Разряд при клике: ветки, расходящиеся от точки на рамке наружу.
function burst(rect: DOMRect, out: Bolt[]) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const n = 6;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rand(-0.3, 0.3);
    // старт — на рамке в направлении ang
    const rx = Math.cos(ang);
    const ry = Math.sin(ang);
    const kx = rect.width / 2 / Math.max(0.001, Math.abs(rx));
    const ky = rect.height / 2 / Math.max(0.001, Math.abs(ry));
    const k = Math.min(kx, ky);
    const sx = cx + rx * k;
    const sy = cy + ry * k;
    const len = rand(16, 38);
    out.push({
      pts: jaggedPath(sx, sy, sx + rx * len, sy + ry * len, rand(4, 7)),
      born: performance.now(),
      ttl: rand(160, 260),
      width: rand(0.8, 1.4),
      mixArc: Math.random()
    });
  }
  // плюс пара дуг по рамке для «обхвата»
  out.push(edgeArc(rect), edgeArc(rect), edgeArc(rect));
}

export function useLightning() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'zap-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      canvas.remove();
      return;
    }

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };
    resize();

    const bolts: Bolt[] = [];
    let hovered: HTMLElement | null = null;
    let hoverTimer = 0;
    let ambientTimer = 0;
    let rafId = 0;
    let rafActive = false;

    const finePointer = window.matchMedia('(pointer: fine)').matches;

    const drawFrame = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const now = performance.now();

      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        const t = (now - b.born) / b.ttl;
        if (t >= 1) {
          bolts.splice(i, 1);
          continue;
        }
        const alpha = (1 - t) * (0.7 + 0.3 * Math.random()); // мерцание
        const r = Math.round(134 + (154 - 134) * b.mixArc);
        const g = Math.round(240 + (128 - 240) * b.mixArc);
        const bl = 255;

        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(b.pts[0][0], b.pts[0][1]);
        for (let p = 1; p < b.pts.length; p++) ctx.lineTo(b.pts[p][0], b.pts[p][1]);

        // ореол
        ctx.strokeStyle = `rgba(${r}, ${g}, ${bl}, ${(alpha * 0.55).toFixed(3)})`;
        ctx.lineWidth = b.width * 3.4;
        ctx.shadowColor = `rgba(${b.mixArc > 0.5 ? ARC : VOLT}, ${(alpha * 0.9).toFixed(3)})`;
        ctx.shadowBlur = 12;
        ctx.stroke();

        // белое ядро
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
        ctx.lineWidth = b.width;
        ctx.shadowBlur = 5;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';

      if (bolts.length > 0 || hovered) {
        rafId = requestAnimationFrame(drawFrame);
      } else {
        rafActive = false;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    const wake = () => {
      if (!rafActive) {
        rafActive = true;
        rafId = requestAnimationFrame(drawFrame);
      }
    };

    // --- Наведение: дуги обегают рамку, пока курсор на кнопке ---
    const hoverSpark = () => {
      if (!hovered) return;
      if (!hovered.isConnected) {
        setCharged(null);
        return;
      }
      const rect = hovered.getBoundingClientRect();
      bolts.push(edgeArc(rect));
      if (Math.random() < 0.4) bolts.push(edgeArc(rect));
      wake();
      hoverTimer = window.setTimeout(hoverSpark, rand(90, 170));
    };

    const setCharged = (el: HTMLElement | null) => {
      if (hovered === el) return;
      hovered?.classList.remove('is-charged');
      window.clearTimeout(hoverTimer);
      hovered = el;
      if (el) {
        el.classList.add('is-charged');
        hoverSpark();
      }
    };

    const onOver = (event: PointerEvent) => {
      if (!finePointer) return;
      const el = (event.target as Element | null)?.closest?.(SELECTOR) as HTMLElement | null;
      setCharged(el);
    };

    const onDown = (event: PointerEvent) => {
      const el = (event.target as Element | null)?.closest?.(SELECTOR) as HTMLElement | null;
      if (!el) return;
      burst(el.getBoundingClientRect(), bolts);
      wake();
    };

    // --- Фоновые искры: сайт «под напряжением» даже без курсора ---
    const ambient = () => {
      const all = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR)).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
      });
      if (all.length) {
        const el = all[Math.floor(Math.random() * all.length)];
        if (el !== hovered) {
          const rect = el.getBoundingClientRect();
          bolts.push(edgeArc(rect));
          if (Math.random() < 0.35) bolts.push(edgeArc(rect));
          wake();
        }
      }
      ambientTimer = window.setTimeout(ambient, rand(1500, 3200));
    };
    ambientTimer = window.setTimeout(ambient, 900);

    window.addEventListener('resize', resize);
    document.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('pointerdown', onDown, { passive: true });

    return () => {
      window.clearTimeout(hoverTimer);
      window.clearTimeout(ambientTimer);
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerdown', onDown);
      hovered?.classList.remove('is-charged');
      canvas.remove();
    };
  }, []);
}
