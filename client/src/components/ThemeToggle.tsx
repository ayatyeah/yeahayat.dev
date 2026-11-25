import { useLang } from '../lib/language';
import { useState } from 'react';

export default function ThemeToggle() {
  const kk=useLang()==='kk';
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  function toggle() {
    const theme = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('portfolio-theme', theme); } catch { /* Private browsing. */ }
    setDark(!dark);
  }
  return <button type="button" className="theme-toggle" onClick={toggle} aria-label={kk?'Қараңғы тақырып':'Тёмная тема'} aria-pressed={dark} title={kk?(dark?'Ашық тақырыпқа ауысу':'Қараңғы тақырыпқа ауысу'):(dark?'Включить светлую тему':'Включить тёмную тему')}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      {dark ? <><circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></> : <path d="M20.5 14.2A9 9 0 0 1 9.8 3.5a9 9 0 1 0 10.7 10.7Z"/>}
    </svg>
  </button>;
}
