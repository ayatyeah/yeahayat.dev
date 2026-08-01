// Светящаяся аура, следующая за курсором. Только для устройств с мышью.

import { useEffect, useRef } from 'react';

export default function CursorAura() {
  const auraRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const aura = auraRef.current;
    if (!aura) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const target = { x: window.innerWidth / 2, y: window.innerHeight * 0.3 };
    const current = { x: target.x, y: target.y };
    let live = false;
    let rafId = 0;

    const onMove = (event: PointerEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;
      if (!live) {
        live = true;
        aura.classList.add('is-live');
      }
    };
    const onDown = () => aura.style.setProperty('--aura-scale', '1.18');
    const onUp = () => aura.style.setProperty('--aura-scale', '1');

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);

    const follow = () => {
      current.x += (target.x - current.x) * 0.12;
      current.y += (target.y - current.y) * 0.12;
      aura.style.setProperty('--aura-x', `${current.x}px`);
      aura.style.setProperty('--aura-y', `${current.y}px`);
      rafId = requestAnimationFrame(follow);
    };
    rafId = requestAnimationFrame(follow);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  return <div ref={auraRef} className="cursor-aura" aria-hidden="true" />;
}
