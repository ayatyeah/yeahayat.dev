import { useEffect, useRef } from 'react';

export default function SceneFilm({ className, still, film }: { className: string; still: string; film: string }) {
  const player = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = player.current!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const narrow = matchMedia('(max-width: 700px)');
    const saveData = (navigator as Navigator & { connection?: { saveData: boolean } }).connection?.saveData;
    let visible = false;
    function update() {
      if (!visible || document.hidden || reduced.matches || saveData) {
        video.pause();
        if (reduced.matches || saveData) video.style.visibility = 'hidden';
        return;
      }
      const src = film + '-' + (narrow.matches ? '432' : '768') + '.mp4';
      if (video.getAttribute('src') !== src) video.src = src;
      void video.play().catch(() => {});
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(video);
    reduced.addEventListener('change', update);
    narrow.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      reduced.removeEventListener('change', update);
      narrow.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
      video.pause();
    };
  }, [film]);
  return <div className={className} aria-hidden="true">
    <img className="scene-art" src={still}
      alt="" width="768" height="432" loading="lazy" decoding="async" />
    <video ref={player} className="scene-art" style={{ position: 'absolute', inset: 0, visibility: 'hidden' }}
      onPlaying={event => { event.currentTarget.style.visibility = 'visible'; }}
      preload="none" muted loop playsInline disablePictureInPicture tabIndex={-1} />
  </div>;
}
