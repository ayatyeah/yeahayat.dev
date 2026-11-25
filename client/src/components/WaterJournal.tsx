import { useEffect, useRef, type ReactNode } from 'react';
import { getVisualScrollY, subscribeVisualScroll } from '../hooks/useScrollFeel';
import '../styles/journal.css';

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export default function WaterJournal({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const journal = root.current!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const sections = [...journal.querySelectorAll<HTMLElement>('[data-current], .project-archive, .board-print, .service-workbench, .project-workshop, .sun-lab')]
      .map(el => ({
        el, top: 0, height: 0, enter: -1, passage: -1,
        refract: el.matches('.business-intro,.archive-banner,.skills-marquee,.board-print,.service-workbench,.project-workshop,.sun-lab'),
      }));
    const preview = journal.querySelector<HTMLElement>('.workbench-preview')!;
    const print = journal.querySelector<HTMLElement>('.workbench-display')!;
    const book = journal.querySelector<HTMLElement>('.case-folio')!;
    let previewMid = 0, bookMid = 1, lastFlight = -1;
    const caption = preview.querySelector<HTMLElement>('figcaption')!;
    let distanceX = 0, previewWidth = 1, previewHeight = 1, endScale = 1;
    let viewport = 0;
    let measureFrame = 0;

    function draw() {
      if (!viewport || document.hidden || reduced.matches) return;
      const y = getVisualScrollY();
      const progress = clamp((y + viewport*.55 - previewMid) / Math.max(1,bookMid-previewMid));
      if (progress !== lastFlight) {
        lastFlight = progress;
        // The first fifth preserves a readable, front-facing print. The last
        // tenth already rests on the book. Scroll only changes the composition.
        const turn = clamp((progress-.18)/.73);
        const t = turn*turn*(3-2*turn);
        journal.style.setProperty('--folio-flight',String(progress));
        if (progress > 0 && progress < 1) {
          const scale = 1 + (endScale-1)*t;
          const arc = Math.sin(Math.PI*t);
          const dx = distanceX*t - arc*previewWidth*.045;
          const dy = (bookMid-previewMid)*progress - viewport*.025*arc;
          print.style.transform = `translate3d(${dx}px,${dy}px,0) perspective(1400px) rotateZ(${-11*t}deg) rotateY(${18*t-arc*13}deg) scale(${scale})`;
          caption.style.transform = `translate3d(${dx}px,${dy-(1-scale)*previewHeight/2}px,0)`;
        } else {
          print.style.removeProperty('transform');
          caption.style.removeProperty('transform');
        }
      }
      for (const section of sections) {
        const { el, top, height } = section;
        if (top > y + viewport || top + height < y) continue;
        const t = clamp((y + viewport * .95 - top) / (viewport * .52));
        const enter = Math.round(t * t * (3 - 2 * t) * 1000);
        if (enter !== section.enter) {
          section.enter = enter;
          el.style.setProperty('--enter', String(enter / 1000));
        }
        if (section.refract) {
          const passage = Math.round(clamp((y + viewport - top) / (viewport + height)) * 1000);
          if (passage !== section.passage) {
            section.passage = passage;
            el.style.setProperty('--passage', String(passage / 1000));
          }
        }
      }
    }
    function measure() {
      measureFrame = 0;
      if (document.hidden || reduced.matches) return;
      const y = window.scrollY;
      viewport = window.innerHeight;
      const source = preview.getBoundingClientRect();
      previewWidth = source.width;
      previewHeight = print.offsetHeight;
      previewMid = y + source.top + previewHeight/2;
      const leaf = book.querySelector('img')!;
      const target = leaf.getBoundingClientRect();
      bookMid = y + target.top + target.height/2;
      distanceX = target.left + target.width/2 - (source.left + source.width/2);
      endScale = leaf.offsetWidth/Math.max(1,previewWidth);
      lastFlight = -1;
      for (const section of sections) {
        const box = section.el.getBoundingClientRect();
        section.top = y + box.top;
        section.height = box.height;
      }
      draw();
    }
    function queueMeasure() {
      if (!measureFrame && !reduced.matches && !document.hidden)
        measureFrame = requestAnimationFrame(measure);
    }
    function updateMotion() {
      if (reduced.matches) {
        delete journal.dataset.motion;
        journal.style.removeProperty('--folio-flight');
        print.style.removeProperty('transform');
        caption.style.removeProperty('transform');
        lastFlight = -1;
        for (const section of sections) {
          section.el.style.removeProperty('--enter');
          section.el.style.removeProperty('--passage');
          section.enter = section.passage = -1;
        }
      } else {
        journal.dataset.motion = 'on';
        queueMeasure();
      }
    }

    const inView = new IntersectionObserver(entries => {
      for (const entry of entries) entry.target.toggleAttribute('data-in-view', entry.isIntersecting);
    });
    journal.querySelectorAll('.business-intro,.service-workbench,.home-cases .archive-banner,.project-archive,.edition-case,.sun-lab')
      .forEach(el => inView.observe(el));
    const resize = new ResizeObserver(queueMeasure);
    resize.observe(journal.parentElement ?? journal);
    resize.observe(journal);
    resize.observe(preview);
    resize.observe(book);
    sections.forEach(({ el }) => resize.observe(el));
    const stop = subscribeVisualScroll(draw);
    window.addEventListener('resize', queueMeasure);
    document.addEventListener('visibilitychange', queueMeasure);
    reduced.addEventListener('change', updateMotion);
    updateMotion();
    return () => {
      stop();
      resize.disconnect();
      inView.disconnect();
      cancelAnimationFrame(measureFrame);
      window.removeEventListener('resize', queueMeasure);
      document.removeEventListener('visibilitychange', queueMeasure);
      reduced.removeEventListener('change', updateMotion);
    };
  }, []);
  return (
    <div className="water-journal" ref={root}>
      {children}
    </div>
  );
}
