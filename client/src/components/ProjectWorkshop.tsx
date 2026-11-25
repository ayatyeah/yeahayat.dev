import { useState } from 'react';
import { PROJECTS, workbenchScreen } from '../data/projects';
import { useLang } from '../lib/language';
import { useSelectedCase } from '../lib/selectedCase';
import { screenPreview, screenSources } from '../lib/screenImages';
import '../styles/projectWorkshop.css';
import '../styles/closing.css';

const kit = [
  ['React', 'JavaScript', 'UX'],
  ['Node.js', 'Python', 'Go', 'Java', 'Spring Boot', 'REST API'],
  ['Docker', 'C++']
];

export default function ProjectWorkshop() {
  const project = useSelectedCase() ?? PROJECTS[0];
  const lang = useLang();
  const kk = lang === 'kk';
  const [view, setView] = useState<{slug:string; tool:'cursor'|'code'} | null>(null);
  const mode = view?.slug === project.slug ? view.tool : 'cursor';
  const setMode = (tool:'cursor'|'code') => setView({slug:project.slug, tool});
  const lesson = project.slug === 'yeahgrind';
  const interfaceScreen = lesson ? project.screens[1] : workbenchScreen(project);
  const alternate = project.screens.find(screen => screen !== interfaceScreen && screen !== project.screens[0]) ?? project.screens[0];
  const screen = mode === 'cursor' ? interfaceScreen : alternate;
  const labels = {
    cursor: lesson ? (kk ? 'Сабақты оқу' : 'Разобрать тему') : 'Интерфейс',
    code: lesson ? (kk ? 'Өзіңді тексеру' : 'Проверить себя') : (kk ? 'Іске асыру' : 'Реализация')
  };
  const groups = kk ? ['Интерфейстер', 'Сервер', 'Құралдар мен тілдер'] : ['Интерфейсы', 'Сервер', 'Инструменты и языки'];

  return <section className="skills-marquee project-workshop" data-current id="stack" aria-labelledby="stack-heading">
    <div className="workshop-stage">
      <div className="workshop-story">
        <h2 id="stack-heading">{kk ? project.title + ' қалай жұмыс істейді?' : 'Как устроен ' + project.title}</h2>
        <div id="workshop-result" aria-live="polite" aria-atomic="true">
          <p key={project.slug + mode}>{lesson || mode === 'code' ? project.work[lang] : project.benefit[lang]}</p>
        </div>
      <div className="workshop-tools" id="water-tools" role="group" aria-label={kk ? 'Жоба көрінісі' : 'Взгляд на проект'}>
        {(['cursor', 'code'] as const).map(tool => <div className="workshop-tool" key={tool}>
          <button className="water-figure workshop-select" data-water-figure={tool} type="button"
            aria-pressed={mode === tool} aria-controls="workshop-result" onClick={() => setMode(tool)}>
            <canvas aria-hidden="true"/><span>{labels[tool]}</span>
          </button>
          <button type="button" className="workshop-static" aria-controls="workshop-result" aria-pressed={mode === tool} onClick={() => setMode(tool)}>
            {labels[tool]}
          </button>
        </div>)}
      </div>
      <a className="workshop-return" href={'#case-' + project.slug}>{kk ? 'Жобаның барлық экрандары' : 'Все экраны проекта'} ↑</a>
      </div>
      <figure className="workshop-print">
        <img src={screenPreview(screen.src, 800)} srcSet={screenSources(screen.src)} sizes="(max-width: 760px) 88vw, 48vw" alt={screen.caption[lang]} width="1600" height="900" loading="lazy" decoding="async" />
        <figcaption>{project.title}<span>{screen.caption[lang]}</span></figcaption>
      </figure>
    </div>
    <details className="workshop-kit">
      <summary>{kk ? 'Қолданатын технологияларым' : 'Технологии, с которыми я работаю'}</summary>
      <dl>{kit.map((tools,i) => <div key={tools[0]}><dt>{groups[i]}</dt><dd>{tools.join(' · ')}</dd></div>)}</dl>
    </details>
  </section>;
}
