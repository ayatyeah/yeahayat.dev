import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { useLang } from '../lib/language';
import { selectCase, useSelectedCase } from '../lib/selectedCase';
import { TransitionLink } from '../lib/transition';
import '../styles/projectArchive.css';
import WaterFigure from './WaterFigure';
import { screenPreview, screenSources } from '../lib/screenImages';
import { coverScene } from '../lib/sceneVisibility';
import { createPortal, flushSync } from 'react-dom';
import { PROJECTS, workbenchScreen, type Project } from '../data/projects';

const copy = {
  ru: {
    projects: 'Выбор проекта', gallery: 'Галерея', openGallery: 'Открыть галерею',
    next: 'Следующий скриншот', prev: 'Предыдущий скриншот', close: 'Закрыть',
    site: 'Открыть сайт', play: 'Перейти к игре', work: 'Что я сделал', benefit: 'Для пользователя'
  },
  kk: {
    projects: 'Жоба таңдау', gallery: 'Галерея', openGallery: 'Галереяны ашу',
    next: 'Келесі скриншот', prev: 'Алдыңғы скриншот', close: 'Жабу',
    site: 'Сайтты ашу', play: 'Ойынға өту', work: 'Менің жұмысым', benefit: 'Пайдаланушыға пайдасы'
  }
};

type LightboxState = { project: Project; index: number } | null;

// Keep the last decoded screen under the incoming one during a rapid change.
function Screen({ src, alt, last, cover = false }: {
  src: string; alt: string; last: MutableRefObject<string>; cover?: boolean;
}) {
  const [previous] = useState(() => last.current);
  const [ready, setReady] = useState(false);
  return <span className={cover ? 'screen-frame cover-screen' : 'screen-frame gallery-screen'}>
    {previous && <img src={previous} alt="" aria-hidden="true" />}
    <img className={cover ? 'screen-incoming' : 'screen-incoming lightbox-img'}
      src={src} srcSet={cover ? screenSources(src) : undefined}
      sizes={cover ? '(max-width: 760px) 94vw, (max-width: 1280px) 62vw, 820px' : undefined}
      alt={alt} loading={cover ? 'lazy' : 'eager'} decoding="async"
      data-ready={ready} onError={() => setReady(true)}
      onLoad={event => { last.current = event.currentTarget.currentSrc; setReady(true); }} />
  </span>;
}

function CaseReader({ project, open, last, index, setIndex }: {
  project: Project; open: (index: number) => void; last: MutableRefObject<string>;
  index: number; setIndex: (index:number)=>void;
}) {
  const lang = useLang();
  const shots = project.screens;
  const shot = shots[index];
  const text = copy[lang];
  return <div className="case-reader">
    <button type="button" className="archive-cover" onClick={() => open(index)}
      aria-label={text.openGallery + ' · ' + project.title + ' · ' + shot.caption[lang]}>
      <Screen key={shot.src} cover src={shot.src} alt={shot.caption[lang]} last={last} />
      <span className="cover-counter">{text.gallery} <b aria-hidden="true">⤢</b></span>
    </button>
    <div className="case-reader-transport">
      <div className="case-reader-caption" aria-live="polite" aria-atomic="true">
        <span>{String(index + 1).padStart(2, '0')} / {String(shots.length).padStart(2, '0')}</span>
        <strong>{shot.caption[lang]}</strong>
      </div>
      <div className="case-reader-arrows">
        <button type="button" aria-label={text.prev} onClick={() => setIndex((index + shots.length - 1) % shots.length)}>←</button>
        <button type="button" aria-label={text.next} onClick={() => setIndex((index + 1) % shots.length)}>→</button>
      </div>
    </div>
    <div className="case-reader-track" aria-hidden="true">{shots.map((s, i) =>
      <i key={s.src} data-lit={i <= index} />)}</div>
  </div>;
}

function Lightbox({ state, onClose, onStep }: { state: LightboxState; onClose: () => void; onStep: (dir: 1 | -1) => void }) {
  const lang = useLang();
  const text = copy[lang];
  const dialog = useRef<HTMLDivElement>(null);
  const open = state !== null;
  const lastScreen = useRef('');

  useEffect(() => {
    if (!open || !dialog.current) return;
    const root = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const controls = Array.from(root.querySelectorAll<HTMLElement>('a[href], button'));
    controls[controls.length - 1]?.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') onStep(1);
      if (event.key === 'ArrowLeft') onStep(-1);
      if (event.key !== 'Tab') return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const revealScene = coverScene();
    return () => {
      revealScene();
      document.removeEventListener('keydown', onKey);
      lastScreen.current = '';
      document.body.style.overflow = previousOverflow;
      opener?.focus({ preventScroll: true });
    };
  }, [open, onClose, onStep]);

  if (!state) return null;

  const { project, index } = state;
  const many = project.screens.length > 1;

  // Портал в body: предки с transform/filter ломают position: fixed,
  // поэтому лайтбокс рендерится вне дерева секций.
  return createPortal(
    <div ref={dialog} className="lightbox" role="dialog" aria-modal="true" aria-label={`${text.gallery} · ${project.title}`} onClick={onClose}>
      <figure className="lightbox-figure" onClick={(event) => event.stopPropagation()}>
        <Screen key={project.screens[index].src} src={project.screens[index].src} last={lastScreen}
          alt={`${project.title} — ${project.screens[index].caption[lang]}`} />
        <figcaption className="lightbox-caption">
          <span>{project.title}</span>
          <span className="lightbox-page" role="status" aria-atomic="true"><span className="water-sr">{index+1} / {project.screens.length} · </span>{project.screens[index].caption[lang]}</span>
          {many && (
            <span className="lightbox-counter">
              {index + 1} / {project.screens.length}
            </span>
          )}
          {project.url && <a className="lightbox-visit" href={project.url} target="_blank" rel="noreferrer">
            {text.site} ↗
          </a>}
          {many && (
            <span className="lightbox-controls">
              <button className="lightbox-nav lightbox-prev" onClick={() => onStep(-1)} aria-label={text.prev}>
                ←
              </button>
              <button className="lightbox-nav lightbox-next" onClick={() => onStep(1)} aria-label={text.next}>
                →
              </button>
            </span>
          )}
        </figcaption>
      </figure>
      <button className="lightbox-close" onClick={event => { event.stopPropagation(); onClose(); }} aria-label={text.close}>
        ✕
      </button>
    </div>,
    document.body
  );
}

const leadCases = ['yeahgrind', 'shmagro'];
const homeProjects = [
  ...leadCases.map(slug => PROJECTS.find(project => project.slug === slug)!),
  ...PROJECTS.filter(project => !leadCases.includes(project.slug)),
];

function ShareCase({project}: {project: Project}) {
  const kk = useLang() === 'kk';
  const [copied, setCopied] = useState(false);
  const url = '/work/' + project.slug;
  return <a href={url} onClick={async event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !navigator.clipboard) return;
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(new URL(url, window.location.origin).href);
      setCopied(true);
    } catch { window.location.assign(url); }
  }} onBlur={() => setCopied(false)}><span role="status">{copied
    ? (kk ? 'Сілтеме көшірілді' : 'Ссылка скопирована')
    : (kk ? 'Жобамен бөлісу' : 'Поделиться кейсом')}</span></a>;
}

function ProjectPrint({ project, featured, onOpen }: {
  project: Project; featured: boolean; onOpen: (project: Project, index: number) => void;
}) {
  const lang = useLang();
  const text = copy[lang];
  const shot = workbenchScreen(project);
  const index = project.screens.indexOf(shot);
  const secondaryIndex = index === 0 ? 1 : 0;
  const secondary = project.screens[secondaryIndex];
  const mainAction = lang === 'kk' ? 'Экрандарды қарау' : 'Смотреть экраны';

  return <article className={'board-print edition-case ' + (featured ? 'feature-spread' : 'index-spread')}
    id={'case-' + project.slug} aria-labelledby={'title-' + project.slug}>
    <div className="print-notes edition-notes">
      <div className="print-title">
        <p className="print-type">{project.label[lang]}</p>
        <h3 id={'title-' + project.slug}><button type="button" onClick={() => onOpen(project, index)}
          aria-describedby={'intro-' + project.slug}>{project.title}</button></h3>
      </div>
      <p className="print-benefit" id={'intro-' + project.slug}>{project.benefit[lang]}</p>
      <div className="print-links">
        <button type="button" className="edition-read" onClick={() => onOpen(project, index)}>
          {mainAction}<span aria-hidden="true">↗</span>
        </button>
        {project.url && <a href={project.url} target="_blank" rel="noreferrer">{text.site} ↗</a>}
        <ShareCase project={project} />
        <a href="#stack" onClick={() => selectCase(project.slug)}>{lang === 'kk' ? 'Қалай жасалды' : 'Как устроен проект'} ↓</a>
      </div>
    </div>
    <figure className="print-spread edition-plate">
      <div className="edition-art">
        {featured && secondary && <button type="button" className="print-cover edition-landing"
          aria-label={text.openGallery + ' · ' + project.title + ' · ' + secondary.caption[lang]} onClick={() => onOpen(project, secondaryIndex)}>
          <img src={screenPreview(secondary.src, 480)} srcSet={screenSources(secondary.src)} sizes="(max-width: 760px) 47vw, 33vw"
            width="1600" height="900" loading="lazy" decoding="async" alt={secondary.caption[lang]} />
        </button>}
        <button type="button" className={(featured ? 'print-inside' : 'print-cover') + ' edition-screen'}
          aria-label={text.openGallery + ' · ' + project.title + ' · ' + shot.caption[lang]} onClick={() => onOpen(project, index)}>
          <img src={screenPreview(shot.src, 800)} srcSet={screenSources(shot.src)}
            sizes={featured ? '(max-width: 760px) 82vw, (max-width: 1450px) 44vw, 670px' : '(max-width: 760px) 85vw, 37vw'}
            width="1600" height="900" loading="lazy" decoding="async" alt={shot.caption[lang]} />
        </button>
      </div>
      <figcaption><WaterFigure kind={project.slug} /><span>{shot.caption[lang]}</span><span className="edition-count">{index + 1} / {project.screens.length}</span>
        <p className="edition-role">{project.work[lang]}</p>
      </figcaption>
    </figure>
  </article>;
}

function projectFromHash() {
  return PROJECTS.find(project => window.location.hash === '#case-' + project.slug);
}

export default function ProjectShowcase({ board = false, single }: { board?: boolean; single?: Project }) {
  const lang = useLang();
  const text = copy[lang];
  const current = useSelectedCase();
  const selected = single ?? current ?? projectFromHash() ?? PROJECTS[0];
  const [lightbox, setLightbox] = useState<LightboxState>(null);
  const [reader, setReader] = useState<LightboxState>(() => {
    const screen = new URLSearchParams(location.search).get('screen');
    const index = Number(screen) - 1;
    return Number.isInteger(index) && index >= 0 && index < selected.screens.length ? {project:selected, index} : null;
  });
  const transition = useRef<ReturnType<Document['startViewTransition']> | null>(null);
  const lastCover = useRef('');
  useEffect(()=>{
    if(lightbox)setReader(lightbox);
  },[lightbox]);
  useEffect(()=>()=>{transition.current?.skipTransition();},[]);
  const zoom = useCallback((target: LightboxState) => {
    transition.current?.skipTransition();
    if (board || !document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLightbox(target); return;
    }
    document.documentElement.dataset.caseZoom='';
    const animation=document.startViewTransition(async ()=>{
      flushSync(()=>setLightbox(target));
      const selector=target ? '.lightbox-img' : '.archive-entry:not([hidden]) .screen-incoming';
      const image=document.querySelector<HTMLImageElement>(selector);
      // The responsive inline screenshot can differ from the full-size source.
      // Do not hold the page snapshot on a slow image connection.
      if(image)await Promise.race([image.decode().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,180))]);
    });
    transition.current=animation;
    void Promise.allSettled([animation.ready,animation.finished]).then(()=>{
      if(transition.current===animation){delete document.documentElement.dataset.caseZoom;transition.current=null;}
    });
  },[board]);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    let frame = 0;
    function followHash() {
      const project = projectFromHash();
      if (!project) return;
      selectCase(project.slug);
      if (board) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const panel = document.getElementById('case-' + project.slug);
        if (!panel || panel.hidden) return;
        panel.scrollIntoView({ block: 'start' });
        panel.querySelector<HTMLButtonElement>('.archive-cover')?.focus({ preventScroll: true });
      });
    }
    followHash();
    window.addEventListener('hashchange', followHash);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', followHash);
    };
  }, [board]);

  useEffect(()=>{
    const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-water-figure]'));
    const controller=new AbortController();
    const observer=new IntersectionObserver(entries=>{
      if(!entries.some(e=>e.isIntersecting))return;
      observer.disconnect();
      import('../lib/waterFigures').then(({mountFigures})=>mountFigures(buttons,controller.signal))
        .catch(()=>buttons.forEach(button=>{
          if(button.dataset.waterFigure==='yeahgrind')button.dataset.bookFallback='true';
          else if (button.dataset.waterFigure === 'shmagro') button.dataset.figureFallback = 'wheat';
          else button.hidden=true;
        }));
    },{rootMargin:'200px'});
    buttons.forEach(b=>observer.observe(b));
    return ()=>{controller.abort();observer.disconnect();};
  },[]);

  const close = useCallback(() => zoom(null), [zoom]);
  const step = useCallback((dir: 1 | -1) => {
    setLightbox((current) => {
      if (!current) return current;
      const total = current.project.screens.length;
      return { ...current, index: (current.index + dir + total) % total };
    });
  }, []);

  function select(project: Project) {
    selectCase(project.slug);
    if (projectFromHash()) {
      window.history.replaceState(window.history.state, '', '#case-' + project.slug);
    }
  }

  function openProject(project: Project, index = 0) {
    selectCase(project.slug);
    zoom({project, index});
  }

  if (board) return <div className="project-board project-edition" id="featured-case">
    {homeProjects.map(project => <ProjectPrint project={project} key={project.slug}
      featured={leadCases.includes(project.slug)} onOpen={openProject} />)}
    <Lightbox state={lightbox} onClose={close} onStep={step} />
  </div>;

  return (
    <div className="project-archive" data-single={single ? true : undefined} id="featured-case">
      {!single && <div className="archive-index" role="tablist" aria-label={text.projects}>
        {PROJECTS.map((project, index) => (
          <button type="button" role="tab" key={project.slug} id={'tab-' + project.slug}
            aria-controls={'case-' + project.slug} aria-selected={selected === project}
            tabIndex={selected === project ? 0 : -1} ref={el => { tabs.current[index] = el; }}
            onClick={() => select(project)} onKeyDown={event => {
              let next = index;
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next++;
              else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next--;
              else if (event.key === 'Home') next = 0;
              else if (event.key === 'End') next = PROJECTS.length - 1;
              else return;
              event.preventDefault();
              next = (next + PROJECTS.length) % PROJECTS.length;
              select(PROJECTS[next]);
              tabs.current[next]?.focus({ preventScroll: true });
            }}>
            <span className="archive-tab-name">{project.title}</span>
            <img className="archive-tab-print" alt="" width="144" height="81" loading="lazy" decoding="async"
              src={screenPreview(project.screens[0].src, 144)} />
            <small>{project.label[lang]}</small>
          </button>
        ))}
      </div>}
      {(single ? [single] : PROJECTS).map(project => (
        <article key={project.slug} className="archive-entry" role={single ? undefined : 'tabpanel'} tabIndex={-1}
          id={'case-' + project.slug} aria-labelledby={single ? undefined : 'tab-' + project.slug} hidden={selected !== project}>
          {selected === project && (
            <CaseReader project={project} last={lastCover} index={reader?.project===project?reader.index:0}
              setIndex={index=>setReader({project,index})} open={index => zoom({ project, index })} />
          )}
          <div className="archive-heading">
            {single ? <p className="case-category">{project.label[lang]}</p> : <h3>{project.title}</h3>}
            <WaterFigure kind={project.slug} />
          </div>
          <dl className="archive-detail">
            {!single && <div><dt>{text.benefit}</dt><dd>{project.benefit[lang]}</dd></div>}
            <div><dt>{text.work}</dt><dd>{project.work[lang]}</dd></div>
          </dl>
          <div className="archive-actions" style={{display: 'flex', flexWrap: 'wrap', gap: '8px 24px'}}>
            <ShareCase project={project} />
            {project.url && <a className="archive-visit" href={project.url} target="_blank" rel="noreferrer">{text.site} ↗</a>}
            {window.location.pathname === '/'
              ? <a className="archive-visit" href="#light-game" onClick={() => selectCase(project.slug)}>{text.play} ↓</a>
              : <TransitionLink className="archive-visit" to={'/?field=' + project.slug + '#light-game'}>{text.play} ↗</TransitionLink>}
          </div>
        </article>
      ))}
      <Lightbox state={lightbox} onClose={close} onStep={step} />
    </div>
  );
}
