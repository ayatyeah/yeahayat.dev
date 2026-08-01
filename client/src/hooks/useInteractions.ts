// Reveal-анимации, «магнитные» кнопки и tilt-панели.
// Перенос логики из старого script.js, но с повторной инициализацией
// на каждую смену маршрута и уважением prefers-reduced-motion.

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useInteractions() {
  const location = useLocation();

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;

    // ---- Reveal ----
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -40px 0px' }
    );

    const revealItems = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    revealItems.forEach((item, index) => {
      item.classList.remove('visible');
      item.style.transitionDelay = `${Math.min(index * 90, 540)}ms`;
      observer.observe(item);
    });

    const cleanups: Array<() => void> = [() => observer.disconnect()];

    if (!reduced && finePointer) {
      // ---- Magnetic ----
      document.querySelectorAll<HTMLElement>('.magnetic').forEach((item) => {
        const onMove = (event: PointerEvent) => {
          const rect = item.getBoundingClientRect();
          const x = event.clientX - rect.left - rect.width / 2;
          const y = event.clientY - rect.top - rect.height / 2;
          item.style.transform = `translate3d(${x * 0.14}px, ${y * 0.18}px, 34px) rotateX(${-y * 0.05}deg) rotateY(${x * 0.05}deg)`;
        };
        const onLeave = () => {
          item.style.transform = '';
        };
        item.addEventListener('pointermove', onMove);
        item.addEventListener('pointerleave', onLeave);
        cleanups.push(() => {
          item.removeEventListener('pointermove', onMove);
          item.removeEventListener('pointerleave', onLeave);
          item.style.transform = '';
        });
      });

      // ---- Tilt ----
      document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((panel) => {
        const onMove = (event: PointerEvent) => {
          const rect = panel.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          panel.style.transform = `rotateX(${-y * 9}deg) rotateY(${x * 11}deg) translateZ(18px)`;
        };
        const onLeave = () => {
          panel.style.transform = '';
        };
        panel.addEventListener('pointermove', onMove);
        panel.addEventListener('pointerleave', onLeave);
        cleanups.push(() => {
          panel.removeEventListener('pointermove', onMove);
          panel.removeEventListener('pointerleave', onLeave);
          panel.style.transform = '';
        });
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, [location.pathname]);
}
