// Витрина кейсов: карточки со скриншотами. Клик по скриншоту открывает
// лайтбокс прямо на сайте — не нужно уходить на сторонний домен.
// Используется и на главной, и на странице «Проекты».

import { useCallback, useEffect, useState } from 'react';
import { PROJECTS, type Project } from '../data/projects';

type LightboxState = { project: Project; index: number } | null;

function Lightbox({ state, onClose, onStep }: { state: LightboxState; onClose: () => void; onStep: (dir: 1 | -1) => void }) {
  useEffect(() => {
    if (!state) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') onStep(1);
      if (event.key === 'ArrowLeft') onStep(-1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [state, onClose, onStep]);

  if (!state) return null;

  const { project, index } = state;
  const many = project.screens.length > 1;

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`Скриншоты ${project.title}`} onClick={onClose}>
      <figure className="lightbox-figure" onClick={(event) => event.stopPropagation()}>
        <img className="lightbox-img" src={project.screens[index].src} alt={`${project.title} — ${project.screens[index].caption}`} />
        <figcaption className="lightbox-caption">
          <span>{project.title}</span>
          <span className="lightbox-page">{project.screens[index].caption}</span>
          {many && (
            <span className="lightbox-counter">
              {index + 1} / {project.screens.length}
            </span>
          )}
          <a className="lightbox-visit" href={project.url} target="_blank" rel="noreferrer">
            открыть сайт ↗
          </a>
        </figcaption>
        {many && (
          <>
            <button className="lightbox-nav lightbox-prev" onClick={() => onStep(-1)} aria-label="Предыдущий скриншот">
              ←
            </button>
            <button className="lightbox-nav lightbox-next" onClick={() => onStep(1)} aria-label="Следующий скриншот">
              →
            </button>
          </>
        )}
      </figure>
      <button className="lightbox-close" onClick={onClose} aria-label="Закрыть">
        ✕
      </button>
    </div>
  );
}

export default function ProjectShowcase() {
  const [lightbox, setLightbox] = useState<LightboxState>(null);

  const close = useCallback(() => setLightbox(null), []);
  const step = useCallback((dir: 1 | -1) => {
    setLightbox((current) => {
      if (!current) return current;
      const total = current.project.screens.length;
      return { ...current, index: (current.index + dir + total) % total };
    });
  }, []);

  return (
    <>
      <div className="case-grid">
        {PROJECTS.map((project) => (
          <article key={project.slug} className={`case-card${project.featured ? ' case-card-featured' : ''}`} data-tilt>
            <button
              className="case-shot"
              type="button"
              onClick={() => setLightbox({ project, index: 0 })}
              aria-label={`Смотреть скриншоты ${project.title}`}
            >
              <img src={project.screens[0].src} alt={`${project.title} — превью`} loading="lazy" />
              <span className="case-shot-hint">смотреть кейс</span>
              {project.screens.length > 1 && <span className="case-shot-count">{project.screens.length} скр.</span>}
            </button>
            <div className="case-body">
              <p className="panel-label">{project.label}</p>
              <h3>{project.title}</h3>
              <p>{project.text}</p>
              <a className="project-link magnetic" href={project.url} target="_blank" rel="noreferrer">
                {project.url.replace('https://', '')}
              </a>
            </div>
          </article>
        ))}
      </div>

      <Lightbox state={lightbox} onClose={close} onStep={step} />
    </>
  );
}
