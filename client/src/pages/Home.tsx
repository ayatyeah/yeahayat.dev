import { TransitionLink } from '../lib/transition';

const SKILLS = ['C++', 'Python', 'JavaScript', 'Spring Boot', 'Node.js', 'Docker', 'React', 'Go', 'Java', 'REST API', 'UX'];

function codingDays() {
  const startUtc = Date.UTC(2023, 8, 1);
  const now = new Date();
  const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.floor((nowUtc - startUtc) / 86400000));
}

export default function Home() {
  return (
    <main className="page-main page-main-home">
      <section className="hero hero-core reveal" aria-label="YeahAyat">
        <div className="display-hub home-intro">
          <img className="hero-mark" src="/logo_clean.webp" alt="YeahAyat" width={132} height={132} />
          <h1 className="display-word">Ayat Balmagambet</h1>
          <p className="hero-copy">
            Делаю сайты и приложения, которые выглядят живыми, быстро работают и не разваливаются под реальными
            задачами. Люблю чистую логику, спокойные интерфейсы и проекты, где у каждой детали есть смысл.
          </p>
        </div>

        <div className="quick-links" aria-label="Быстрые ссылки">
          <TransitionLink className="btn btn-white magnetic" to="/projects">
            Смотреть проекты
          </TransitionLink>
          <TransitionLink className="btn btn-dark magnetic" to="/contact">
            Связаться
          </TransitionLink>
          <TransitionLink className="btn btn-white magnetic" to="/github">
            GitHub
          </TransitionLink>
        </div>

        <div className="scroll-signal" aria-hidden="true">
          <span></span>
        </div>
      </section>

      <section className="impact-grid reveal" aria-label="Профиль">
        <article className="impact-panel panel-tall" data-tilt>
          <p className="panel-label">обо мне</p>
          <h2>Собираю идеи в работающие продукты: от интерфейса до серверной логики.</h2>
          <p>
            Пишу frontend и backend, продумываю структуру, API, данные, интеграции и пользовательские сценарии. Мне
            важно, чтобы проект ощущался цельным: без лишней мишуры, с понятным движением и крепкой основой.
          </p>
        </article>

        <article className="impact-panel stat-panel" data-tilt>
          <p className="panel-label">в коде</p>
          <p className="stat-value">
            <span id="codingDays">{codingDays()}</span>
          </p>
          <p className="stat-caption">дней с первой серьёзной точки старта</p>
        </article>

        <article className="impact-panel" data-tilt>
          <p className="panel-label">фокус</p>
          <p>
            Люблю задачи, где нужно соединить красоту и практичность: формы, личные кабинеты, музыкальные сервисы,
            обучение, авторизацию, данные и нормальный UX без ощущения шаблона.
          </p>
        </article>
      </section>

      <section className="skills-marquee reveal" aria-label="Технологии">
        <div className="section-head">
          <p className="panel-label">стек</p>
          <h2>Инструменты, с которыми я чаще всего собираю продукты.</h2>
        </div>

        <div className="skills-orbit">
          <div className="skills-strip" role="presentation">
            {[...SKILLS, ...SKILLS].map((skill, index) => (
              <span className="skill-chip" key={`${skill}-${index}`}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
