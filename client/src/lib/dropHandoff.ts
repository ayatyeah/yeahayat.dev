// Both renderers use CSS pixels. The lens keeps the last projected point
// after the WebGL canvas leaves the viewport.
export interface DropProjection {
  x: number;
  pageY: number;
  radius: number;
  releaseScroll: number;
  blend: number;
}
export let dropProjection: DropProjection | null = null;
const listeners = new Set<() => void>();
export function publishDrop(value: DropProjection | null) {
  if (!value && !dropProjection) return;
  dropProjection = value;
  listeners.forEach(listener => listener());
}
export function observeDrop(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
