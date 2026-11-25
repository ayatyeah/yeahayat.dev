import { useParams, Navigate } from 'react-router-dom';
import { PROJECTS } from '../data/projects';
import { useLang } from '../lib/language';
import ProjectShowcase from '../components/ProjectShowcase';

export default function Projects() {
  const kk = useLang() === 'kk';
  const { slug } = useParams();
  const project = PROJECTS.find(item => item.slug === slug);
  if (slug && !project) return <Navigate to="/projects" replace />;
  return (
    <main className="page-main archive-route">
      <section className="page-head archive-banner">
        <img className="scene-art" src="/environment/ocean-descent-small.webp" alt="" width="760" height="1344" style={{objectPosition:'50% 39%'}} />
        <h1 className="page-title">{project?.title ?? (kk ? 'Жобалар' : 'Проекты')}</h1>
        <p className="business-case-note">{project ? project.benefit[kk ? 'kk' : 'ru'] : kk ? 'Жобаны таңдап, оның интерфейсін және атқарған жұмысымды көріңіз.' : 'Выберите проект, чтобы посмотреть интерфейс и мою работу над ним.'}</p>
      </section>

      <section className="projects" id="projects">
        <ProjectShowcase key={slug} single={project} />
      </section>
    </main>
  );
}
