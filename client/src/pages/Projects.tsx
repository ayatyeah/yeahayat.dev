type Project = {
  label: string;
  title: string;
  text: string;
  url: string;
  featured?: boolean;
};

const PROJECTS: Project[] = [
  {
    label: 'музыка',
    title: 'YeahMusic',
    text: 'Музыкальный веб-сервис с живым интерфейсом, личной атмосферой и быстрым доступом к трекам.',
    url: 'https://yeahmusic.tech',
    featured: true
  },
  {
    label: 'обучение',
    title: 'StudyLoop',
    text: 'Платформа для учёбы, где материалы и прогресс собраны в понятный спокойный поток.',
    url: 'https://studyloop.tech'
  },
  {
    label: 'продажи',
    title: 'BLC Soft Sale',
    text: 'Рабочий сайт для продажи софта: продукты, подача, заявки и коммерческая структура без лишней путаницы.',
    url: 'https://blcsoftsale.kz'
  },
  {
    label: 'платформа',
    title: 'Clicki',
    text: 'Платформа с продуманным интерфейсом и живым взаимодействием — собрана как цельный продукт под реальные сценарии.',
    url: 'https://clicki-platform.com'
  }
];

export default function Projects() {
  return (
    <main className="page-main">
      <section className="page-head reveal">
        <h1 className="page-title">Проекты</h1>
      </section>

      <section className="projects reveal" id="projects">
        <div className="project-grid">
          {PROJECTS.map((project) => (
            <article
              key={project.title}
              className={`project-card${project.featured ? ' project-card-featured' : ''}`}
              data-tilt
            >
              <p className="panel-label">{project.label}</p>
              <h2>{project.title}</h2>
              <p>{project.text}</p>
              <a className="project-link magnetic" href={project.url} target="_blank" rel="noreferrer">
                {project.url.replace('https://', '')}
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
