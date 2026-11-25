import { useEffect, useRef } from 'react';
import { subscribeVisualScroll } from '../hooks/useScrollFeel';
import OceanSchool from './OceanSchool';
import '../styles/ocean-atmosphere.css';
import type { CSSProperties } from 'react';
import { mountOceanSurface } from '../lib/oceanSurface';

export default function OceanBackdrop() {
  const view = useRef<HTMLDivElement>(null);
  const surfaceHost = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLImageElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = view.current!, world = plate.current!;
    const canvas = document.createElement('canvas');
    canvas.className = 'ocean-surface';
    surfaceHost.current!.appendChild(canvas);
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let water: ReturnType<typeof mountOceanSurface>;
    let startFrame = 0;
    function startWhenNeeded() {
      cancelAnimationFrame(startFrame);
      if (motion.matches || water) return;
      // Start after commit so a discarded React mount never opens a GPU context.
      startFrame = requestAnimationFrame(() => {
        water = mountOceanSurface(canvas,photo.current!);
        measure();
      });
    }
    let travel = 0, extent = 1, descent = 1, waterline = 0, passage = 0, previous = -1;
    function paint() {
      const y = Math.max(0, Math.min(extent, window.scrollY));
      if (y === previous) return;
      previous = y;
      // A tangent-matched descent crosses the measured horizon on every aspect ratio.
      const cruisingSpeed = (travel - passage) / Math.max(1, extent - descent);
      const progress = Math.min(1, y/descent);
      const eased = 1 - (1-progress)**2;
      const offset = y < descent
        ? cruisingSpeed*y + (passage-cruisingSpeed*descent)*eased
        : passage + cruisingSpeed*(y-descent);
      const horizon = waterline-offset;
      world.style.transform = `translate3d(0,${(-offset).toFixed(1)}px,0)`;
      water?.scroll(offset);
      viewport.style.setProperty('--surface-y', Math.max(0,horizon+8).toFixed(1)+'px');
      viewport.style.setProperty('--submerged', String(Math.min(1,.42+.58*progress)));
    }
    function measure() {
      extent = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      descent = Math.min(extent, viewport.clientHeight * 2.75);
      const imageHeight = Math.max(world.offsetHeight,viewport.clientWidth * 2688/1520);
      waterline = imageHeight*.244 - (imageHeight-world.offsetHeight)/2;
      travel = Math.max(0, world.offsetHeight - viewport.clientHeight);
      passage = descent === extent ? travel : Math.min(travel,Math.max(travel*descent/extent,waterline+viewport.clientHeight*.07));
      water?.resize(viewport.clientWidth, viewport.clientHeight, world.offsetHeight, 1520/2688);
      previous = -1;
      paint();
    }
    const size = new ResizeObserver(measure);
    [document.body, viewport, world].forEach(el => size.observe(el));
    const unsubscribe = subscribeVisualScroll(paint);
    motion.addEventListener('change',startWhenNeeded);
    measure();
    startWhenNeeded();
    return () => {
      unsubscribe(); size.disconnect(); cancelAnimationFrame(startFrame);
      motion.removeEventListener('change',startWhenNeeded);
      water?.destroy(); canvas.remove();
    };
  }, []);
  return <div className="ocean-backdrop" ref={view} aria-hidden="true">
    <div className="ocean-column" ref={plate}>
      <picture>
        <img ref={photo} src="/environment/ocean-descent.webp"
          srcSet="/environment/ocean-descent-small.webp 760w, /environment/ocean-descent-medium.webp 1120w, /environment/ocean-descent.webp 1520w"
          sizes="(max-width: 650px) min(100vw, 370px), 100vw" alt="" width="1520" height="2688" />
      </picture>
    </div>
    <div ref={surfaceHost} />
    <div className="ocean-shade" />
    <div className="ocean-current"><i /><b />
      <div className="ocean-air">{[6, 89, 15, 96, 84].map((left,i)=>
        <span key={left} style={{left:left+'%', '--bubble-size':(i%3)*4+7+'px',
          '--rise':(24+(i*7)%11)+'s', '--phase':(-i*3.7-2)+'s'} as CSSProperties}><i /><b /></span>)}</div>
    </div>
    <OceanSchool />
  </div>;
}
