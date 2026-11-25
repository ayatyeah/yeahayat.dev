import { useState } from 'react';
import { screenPreview } from '../lib/screenImages';
import { PROJECTS, workbenchScreen } from '../data/projects';
import { useLang } from '../lib/language';
import { useChosenCase, useSelectedCase } from '../lib/selectedCase';
import '../styles/archiveOpening.css';

export default function ArchiveOpening({ heading, introduction }: { heading: string; introduction: string }) {
  const lang = useLang();
  const choice = useChosenCase();
  const project = useSelectedCase() ?? PROJECTS[0];
  const [open, setOpen] = useState(false);
  const image = screenPreview(project.screens[0].src, 480);
  const sample = workbenchScreen(project);
  const other = project.screens.find(shot => shot !== sample && shot !== project.screens[0]) ?? project.screens[0];
  const link = lang === 'kk' ? project.title + ' жобасын қарау' : 'Посмотреть ' + project.title;
  const toggle = lang === 'kk' ? (open ? 'Кітапты жабу' : 'Кітапты ашу') : (open ? 'Закрыть книгу' : 'Открыть книгу');
  return <>
    <button className="case-folio" type="button" aria-label={toggle + ' · ' + project.title}
      aria-pressed={open} onClick={() => {
        setOpen(!open);
        window.dispatchEvent(new CustomEvent('portfolio-folio', { detail: { open: !open } }));
      }}>
      <span className="folio-prints" aria-hidden="true">
        {[sample, other].map(shot =>
          <img key={shot.src} src={screenPreview(shot.src, 480)} alt="" width="480" height="270" loading="lazy" decoding="async" />)}
      </span>
      <span className="folio-desk" aria-hidden="true">
        <span className="folio-back" />
        <span className="folio-leaf"><img src={image} alt="" width="480" height="270" loading="lazy" decoding="async" /></span>
        <span className="folio-glass"><span>{project.title}</span></span>
      </span>
      <span className="folio-action">{toggle} <i aria-hidden="true">↺</i></span>
    </button>
    <h2 id="work-heading">{heading}</h2>
    <p className="business-case-note">{choice ? project.benefit[lang] : introduction}</p>
    <a className="scene-link" href={'#case-' + project.slug}>{link} ↘</a>
  </>;
}
