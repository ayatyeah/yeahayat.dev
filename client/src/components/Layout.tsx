import { type ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import VoidScene from './VoidScene';
import CursorAura from './CursorAura';
import { TransitionLink } from '../lib/transition';
import { useInteractions } from '../hooks/useInteractions';

const NAV: Array<{ to: string; label: string }> = [
  { to: '/', label: 'Главная' },
  { to: '/projects', label: 'Проекты' },
  { to: '/contact', label: 'Контакты' },
  { to: '/github', label: 'GitHub' }
];

const TITLES: Record<string, string> = {
  '/': 'YeahAyat — Portfolio',
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
  useInteractions();

  useEffect(() => {
    document.title = TITLES[location.pathname] ?? 'YeahAyat';
    document.body.setAttribute('data-page', PAGE_KEYS[location.pathname] ?? 'home');
  }, [location.pathname]);

  return (
    <>
      <VoidScene />
      <div className="noise-layer" aria-hidden="true" />
      <div className="scan-layer" aria-hidden="true" />
      <CursorAura />

      <div className="ya-transition" aria-hidden="true">
        <span className="ya-mark">YA</span>
        <span className="transition-line" />
      </div>

      <header className="header reveal" id="top">
        <TransitionLink className="brand magnetic" to="/" aria-label="На главную">
          <span className="brand-text">YeahAyat</span>
          <span className="brand-mark-wrap">
            <img className="brand-mark" src="/logo_mark_192.webp" alt="" width={40} height={40} />
          </span>
        </TransitionLink>

        <nav className="nav-links" aria-label="Основная навигация">
          {NAV.filter((item) => item.to !== location.pathname).map((item) => (
            <TransitionLink key={item.to} className="nav-link magnetic" to={item.to}>
              {item.label}
            </TransitionLink>
          ))}
        </nav>
      </header>

      {children}

      <footer className="footer reveal">
        <p>© {new Date().getFullYear()} YeahAyat</p>
        <TransitionLink className="footer-link" to="/privacy">
          Политика конфиденциальности
        </TransitionLink>
      </footer>
    </>
  );
}
