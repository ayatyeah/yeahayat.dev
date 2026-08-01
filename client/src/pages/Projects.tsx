import ProjectShowcase from '../components/ProjectShowcase';

export default function Projects() {
  return (
    <main className="page-main">
      <section className="page-head reveal">
        <h1 className="page-title">Проекты</h1>
      </section>

      <section className="projects reveal" id="projects">
        <ProjectShowcase />
      </section>
    </main>
  );
}
