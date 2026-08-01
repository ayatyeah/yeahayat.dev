import { TransitionLink } from '../lib/transition';

export default function GitHubPage() {
  return (
    <main className="page-main">
      <section className="page-head reveal">
        <h1 className="page-title">GitHub</h1>
      </section>

      <section className="contact-board reveal">
        <a
          className="contact-row magnetic contact-row-main"
          href="https://github.com/ayatyeah"
          target="_blank"
          rel="noreferrer"
        >
          <span>Профиль</span>
          <strong>github.com/ayatyeah</strong>
        </a>
        <TransitionLink className="contact-row magnetic" to="/projects">
          <span>Проекты</span>
          <strong>посмотреть работы</strong>
        </TransitionLink>
      </section>
    </main>
  );
}
