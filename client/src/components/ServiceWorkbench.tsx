import { PROJECTS, workbenchScreen } from '../data/projects';
import { useLang } from '../lib/language';
import { selectCase, useSelectedCase } from '../lib/selectedCase';
import '../styles/workbench.css';
import { screenSources } from '../lib/screenImages';

const categories = [
  ['shmagro', 'blcsoftsale'],
  ['clicki', 'ddc'],
  ['studyloop', 'yeahgrind']
];

export default function ServiceWorkbench({heading, services}: {heading: string; services: string[][]}) {
  const lang = useLang();
  const selected = useSelectedCase() ?? PROJECTS[0];
  const active = categories.findIndex(group => group.includes(selected.slug));
  const examples = categories.map(group => {
    const example = group.find(slug => slug === selected.slug) ?? group[0];
    const project = PROJECTS.find(item => item.slug === example)!;
    return { project, screen: workbenchScreen(project), representative: example === group[0] };
  });
  const {project, screen} = examples[active];

  function choose(index: number) {
    selectCase(examples[index].project.slug);
  }

  return <section className="services-ledger service-workbench" id="services" aria-labelledby="service-heading">
    <div className="workbench-controls">
      <h3 id="service-heading">{heading}</h3>
      <fieldset className="workbench-options" aria-labelledby="service-heading">
        {services.map(([title], index) => <label key={examples[index].project.slug}>
          <input type="radio" name="business-task" checked={active === index}
            aria-controls="service-result" onClick={() => { if (active === index) choose(index); }}
            onChange={() => choose(index)} />
          <span>{index === 1 && selected.slug === 'ddc' ? (lang === 'kk' ? 'Кабинеттер мен порталдар' : 'Кабинеты и порталы') : title}</span>
        </label>)}
      </fieldset>
      <div className="workbench-explanation" id="service-result" aria-live="polite" aria-atomic="true">
        {services.map(([, description], index) => <div key={examples[index].project.slug}
          className="workbench-answer" data-active={active === index} aria-hidden={active !== index}>
          <p>{examples[index].representative ? description : examples[index].project.benefit[lang]}</p>
          <a href={'#case-' + examples[index].project.slug}>
            {lang === 'kk' ? 'Жобаны көру' : 'Посмотреть проект'} · {examples[index].project.title} ↘
          </a>
        </div>)}
      </div>
    </div>
    <figure className="workbench-preview">
      <div className="workbench-display">
        <img key={screen.src} src={screen.src} srcSet={screenSources(screen.src)}
          sizes="(max-width: 760px) 92vw, (max-width: 1440px) 48vw, 680px" alt={screen.caption[lang]} width="1600" height="900"
          loading="lazy" decoding="async" />
      </div>
      <figcaption><b>{project.title}</b><span>{screen.caption[lang]}</span></figcaption>
    </figure>
  </section>;
}
