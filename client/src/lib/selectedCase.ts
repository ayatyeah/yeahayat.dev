import { useSyncExternalStore } from 'react';
import { PROJECTS, type Project } from '../data/projects';

const eventName = 'portfolio-select-case';
const listeners = new Set<() => void>();
let current: Project | null = null;
let chosen: Project | null = null;

function receive(event: Event) {
  const project = PROJECTS.find(item => item.slug === (event as CustomEvent).detail?.slug);
  if (!project) return;
  const nextChosen = (event as CustomEvent).detail?.automatic ? chosen : project;
  if (current === project && chosen === nextChosen) return;
  current = project;
  chosen = nextChosen;
  listeners.forEach(notify => notify());
}

function subscribe(notify: () => void) {
  if (!listeners.size) window.addEventListener(eventName, receive);
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
    if (!listeners.size) window.removeEventListener(eventName, receive);
  };
}

export function selectCase(slug: string, options?: { automatic: boolean }) {
  window.dispatchEvent(new CustomEvent(eventName, { detail: { slug, automatic: options?.automatic } }));
}
export function getSelectedCase() { return current; }
export function useSelectedCase() { return useSyncExternalStore(subscribe, getSelectedCase); }

export function useChosenCase() { return useSyncExternalStore(subscribe, () => chosen); }
