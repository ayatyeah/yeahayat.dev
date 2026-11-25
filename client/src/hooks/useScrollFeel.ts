import { useEffect } from 'react';

const listeners = new Set<() => void>();

export function getVisualScrollY() {
  return window.scrollY;
}

export function subscribeVisualScroll(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// The document owns scrolling. Subscribers only paint from the current position.
export function useScrollFeel(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    function paint() {
      frame = 0;
      listeners.forEach(listener => listener());
    }
    function queue() {
      if (!frame) frame = requestAnimationFrame(paint);
    }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('pageshow', queue);
    queue();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', queue);
      window.removeEventListener('pageshow', queue);
    };
  }, [enabled]);
}
