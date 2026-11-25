import { type ReactNode, useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import '../styles/navigation.css';
import { TransitionLink } from '../lib/transition';
import { useInteractions } from '../hooks/useInteractions';
import { useScrollFeel } from '../hooks/useScrollFeel';
import {useLang} from '../lib/language';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';
import AmbientSound from './AmbientSound';
import OceanBackdrop from './OceanBackdrop';
import { PROJECTS } from '../data/projects';
import { useChosenCase } from '../lib/selectedCase';

const NAV: Array<{ to: string; label: string }> = [
  { to: '/', label: 'Главная' },
  { to: '/projects', label: 'Проекты' },
  { to: '/contact', label: 'Контакты' },
  { to: '/github', label: 'GitHub' }
];

const TITLES: Record<string, string> = {
  '/': 'YeahAyat — Портфолио',
  '/projects': 'YeahAyat — Проекты',
  '/contact': 'YeahAyat — Контакты',
  '/github': 'YeahAyat — GitHub',
  '/privacy': 'YeahAyat — Политика конфиденциальности'
};

const PAGE_KEYS: Record<string, string> = {
  '/': 'home',
  '/projects': 'projects',
  '/contact': 'contact',
  '/github': 'github',
  '/privacy': 'privacy'
};

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousPath = useRef(location.pathname);
  const kk=useLang()==='kk';
  const chosen = useChosenCase();
  useInteractions();
  useScrollFeel(location.pathname === '/');

  useEffect(() => {
    // The router handles SPA history. The pagehide snapshot also survives a full reload.
    const save = () => {
      try { sessionStorage.setItem('portfolio-reload',JSON.stringify({url:window.location.href,y:window.scrollY})); }
      catch { /* Private browsing can disable session storage. */ }
    };
    window.addEventListener('pagehide',save);
    return () => window.removeEventListener('pagehide',save);
  }, []);

  useEffect(() => {
    const changedRoute = previousPath.current !== location.pathname;
    previousPath.current = location.pathname;
    if (changedRoute && navigationType === 'POP') return;
    const anchor = window.location.hash.slice(1);
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    let resumeY: number | undefined;
    if (!changedRoute && navigation?.type === 'reload') {
      try {
        const saved = JSON.parse(sessionStorage.getItem('portfolio-reload') ?? 'null');
        if (saved?.url === window.location.href && Number.isFinite(saved.y)) resumeY = saved.y;
      } catch { /* Allow native anchor navigation without a stored position. */ }
    }
    if (resumeY === undefined && (!anchor || (anchor.startsWith('case-') && location.pathname === '/projects'))) return;

    const input = new AbortController();
    const { signal } = input;
    let frame = 0;
    const cancel = () => {
      input.abort();
      cancelAnimationFrame(frame);
    };
    const stopKeys = (event: KeyboardEvent) => {
      if (['Tab','PageUp','PageDown','Home','End','ArrowUp','ArrowDown',' '].includes(event.key)) cancel();
    };
    window.addEventListener('wheel', cancel, { passive:true, signal });
    window.addEventListener('pointerdown', cancel, { passive:true, signal });
    window.addEventListener('touchstart', cancel, { passive:true, signal });
    window.addEventListener('keydown', stopKeys, { signal });
    // The lazy page, its fonts and the first ResizeObserver delivery can each
    // change the document's final height on a fresh navigation.
    void document.fonts.ready.then(() => {
      if (signal.aborted) return;
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          input.abort();
          if (resumeY !== undefined) window.scrollTo({top:resumeY, behavior:'instant'});
          else document.getElementById(anchor)?.scrollIntoView({behavior:'instant'});
        });
      });
    });
    return cancel;
  }, [location.pathname]);

  useEffect(() => {
    const titlesKK:Record<string,string>={'/':'Портфолио','/projects':'Жобалар','/contact':'Байланыс','/github':'GitHub','/privacy':'Құпиялық саясаты'};
    document.title = kk ? 'YeahAyat — '+(titlesKK[location.pathname]??'Портфолио') : TITLES[location.pathname] ?? 'YeahAyat';
    document.querySelector('meta[name=description]')?.setAttribute('content',kk?'Аят Балмағамбет: бизнеске арналған сайттар, каталогтар және веб-қосымшалар. Жобаларым мен байланыс жолдары.':'Аят Балмагамбет — разработка сайтов, каталогов и веб-приложений для бизнеса. Примеры проектов и контакты.');
    const shared = PROJECTS.find(project => location.pathname === '/work/' + project.slug);
    if (shared) {
      document.title = shared.title + ' · YeahAyat';
      document.querySelector('meta[name=description]')?.setAttribute('content',shared.benefit[kk ? 'kk' : 'ru']);
    }
    document.body.setAttribute('data-page', PAGE_KEYS[location.pathname] ?? 'home');
  }, [location.pathname,kk]);

  return (
    <>
      {location.pathname === '/' && <OceanBackdrop />}
      {location.pathname !== '/' && <div aria-hidden="true" className="ambient-water"><i/><i/></div>}
      <div className="tide-transition" aria-hidden="true" />
      {location.pathname !== '/' && (
        <header className="tide-header" id="top">
          <TransitionLink className="tide-wordmark" to="/" aria-label={kk?'Басты бетке':'На главную'}>
            yeahayat.dev
          </TransitionLink>
          <nav aria-label={kk?'Негізгі мәзір':'Основная навигация'}>
            {NAV.filter((item) => item.to !== '/').map((item) => (
              <TransitionLink key={item.to} to={item.to} aria-current={item.to === location.pathname ? 'page' : undefined}>
                {kk?({'/projects':'Жобалар','/contact':'Байланыс','/github':'GitHub'}[item.to]??item.label):item.label}
              </TransitionLink>
            ))}
            <LanguageToggle />
            <ThemeToggle />
          </nav>
        </header>
      )}

      {children}
      <AmbientSound />

      {location.pathname === '/' && <section className="horizon-contact" id="contact-horizon" aria-labelledby="horizon-heading">
        <div className="horizon-message">
          <h2 id="horizon-heading">{kk ? 'Сізге қандай сайт керек?' : 'Какой сайт вам нужен?'}</h2>
          <p className="horizon-brief">{kk ? 'Клиенттеріңіз кім, сайтта не істеуі керек? Осыдан бастайық.' : 'Расскажите, кто ваши клиенты и что они должны сделать на сайте. С этого и начнём.'}</p>
          <div className="horizon-primary"><TransitionLink to={chosen ? '/contact?project=' + chosen.slug + '#contactForm' : '/contact#contactForm'}>
            {kk ? 'Жобаны талқылау' : 'Обсудить проект'} <span aria-hidden="true">↗</span>
          </TransitionLink></div>
          <div className="horizon-links"><a href="https://t.me/yeahayat" target="_blank" rel="noreferrer">Telegram</a><a href="mailto:balmagambet.ayat@gmail.com">{kk ? 'Электрондық пошта' : 'Электронная почта'}</a></div>
        </div>
      </section>}
      <footer className="tide-footer">
        <p>© {new Date().getFullYear()} YeahAyat</p>
        <TransitionLink to="/privacy">{kk?'Құпиялық саясаты':'Политика конфиденциальности'}</TransitionLink>
      </footer>
    </>
  );
}
