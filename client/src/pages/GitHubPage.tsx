import '../styles/shore-pages.css';
import { useLang } from '../lib/language';
import { TransitionLink } from '../lib/transition';

export default function GitHubPage() {
  const kk = useLang() === 'kk';
  return (
    <main className="page-main shore-page shore-code">
      <section className="page-head shore-head">
        <h1 className="page-title">GitHub</h1>
      </section>

      <section className="contact-board reveal">
        <a
          className="contact-row contact-row-main"
          href="https://github.com/ayatyeah"
          target="_blank"
          rel="noreferrer"
        >
          <span>{kk ? 'Менің профилім' : 'Мой профиль'}</span>
          <strong>github.com/ayatyeah</strong>
        </a>
        <TransitionLink className="contact-row" to="/projects">
          <span>{kk ? 'Жобалар' : 'Проекты'}</span>
          <strong>{kk ? 'жобаларды көру' : 'посмотреть работы'}</strong>
        </TransitionLink>
      </section>
    </main>
  );
}
