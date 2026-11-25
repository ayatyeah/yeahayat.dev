// A full-screen project gallery covers the animated sea even while its canvases
// still intersect the viewport. Keep the last painted frame until it closes.
let galleries = 0;
const change = 'portfolio-scene-visibility';

export function scenePaused() {
  return document.hidden || galleries > 0;
}

export function coverScene() {
  galleries++;
  if (galleries === 1) {
    document.body.dataset.sceneCovered = 'true';
    document.dispatchEvent(new Event(change));
  }
  return () => {
    galleries--;
    if (galleries === 0) {
      delete document.body.dataset.sceneCovered;
      document.dispatchEvent(new Event(change));
    }
  };
}

export function watchSceneVisibility(listener: () => void) {
  document.addEventListener('visibilitychange',listener);
  document.addEventListener(change,listener);
  return () => {
    document.removeEventListener('visibilitychange',listener);
    document.removeEventListener(change,listener);
  };
}
