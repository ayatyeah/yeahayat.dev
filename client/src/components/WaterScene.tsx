import { useEffect, useRef } from 'react';
import { getVisualScrollY, subscribeVisualScroll } from '../hooks/useScrollFeel';
import type { LetterPose } from '../lib/liquidLetters';
import { useLang } from '../lib/language';
import { TransitionLink } from '../lib/transition';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';
import '../styles/water.css';

const copy = {
  ru: {
    nav: ['Обо мне', 'Работы', 'Контакт'],
    chapters: [
      ['Всё начинается с вас', 'Что должен сделать ваш клиент? Выбрать машину из каталога, найти автора для рекламы или пройти первый урок?'],
      ['Каждая деталь на месте', 'От первого экрана до заявки продумываю шаги покупателя. В каталоге «СХМ Агро» можно выбрать технику и сразу написать продавцу.'],
      ['Довожу до запуска', 'Я сам проектирую интерфейс и пишу код. Вы обсуждаете прототип и готовый сайт с одним человеком.'],
      ['Передаю вам', 'Вместе проверяем сайт глазами клиента. Дальше покажу, как это работает на уже запущенных проектах.'],
    ],
  },
  kk: {
    nav: ['Өзім туралы', 'Жұмыстар', 'Байланыс'],
    chapters: [
      ['Бәрі сізден басталады', 'Клиентіңізден бастаймыз. Ол тауар таңдай ма, қабылдауға жазыла ма, әлде сабақ оқи ма?'],
      ['Әр қадам түсінікті', 'Сатып алушы керегін тауып, өтінімді қай жерден қалдыруға болатынын бірден көреді.'],
      ['Іске қосуға дейін жеткіземін', 'Есімім — Аят. Прототипін жасап, кодын жазамын, сайтты іске қосамын.'],
      ['Енді сіздің қолыңызда', 'Іске қосар алдында клиенттің жолын бірге тексереміз. Мұны жобаларым арқылы көрсетейін.'],
    ],
  },
};

const letters = ['Y', 'E', 'A', 'H'];
const principles = ['You', 'Every detail', 'Ayat', 'Handover'];
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => { const t = clamp(v); return t * t * (3 - 2 * t); };

export default function WaterScene({ name, introduction, discuss }: { name: string; introduction: string; discuss: string }) {
  const lang = useLang();
  const labels = copy[lang];
  const track = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = track.current!;
    const panel = frame.current!;
    const art = stage.current!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const notes = [...section.querySelectorAll<HTMLElement>('.letter-note')];
    const centres: number[] = [];
    const author = section.querySelector<HTMLElement>('.studio-author')!;
    const blocks = [author, ...notes];
    const midpoints: number[] = [];
    let disposed = false;
    let unmount: (() => void) | undefined;
    const pose: LetterPose = { turns: 0, enter: 0, focus: 0, passage: 0 };
    let sectionTop = 0, travel = 1, lastProgress = -1;
    const nearHero = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      nearHero.disconnect();
      import('../lib/liquidLetters').then(async ({ mountLiquidScene, loadPanorama }) => {
        if (disposed) return;
        const sky = await loadPanorama();
        if (disposed) sky.dispose();
        else {
          try {
            unmount = mountLiquidScene(art, sky, pose);
            art.dataset.ready = 'true';
          } catch (error) {
            sky.dispose();
            throw error;
          }
        }
      }).catch(() => {
        if (disposed) return;
        art.dataset.fallback = 'true';
        lastProgress = -1;
        paint();
      });
    }, { rootMargin: '160px 0px' });
    nearHero.observe(panel);

    function paint() {
      if (disposed) return;
      const y = getVisualScrollY();
      const progress = reduced.matches ? 0 : clamp((y - sectionTop) / travel);
      const readLine = y + window.innerHeight * .50;
      blocks.forEach((block,i) => {
        const position = (midpoints[i] - y) / window.innerHeight;
        const offset = position - .50;
        const distance = Math.abs(offset);
        const hold = 1-smooth((distance-.45)/.44);
        // Keep adjacent captions in the frame throughout the handover.
        // Only the inner copy moves, so the measured chapter centres stay stable.
        if (i > 0) {
          const shift = reduced.matches ? 0 : -offset*window.innerHeight*.56*hold;
          block.style.setProperty('--caption-shift', shift.toFixed(1)+'px');
        }
        const opacity = reduced.matches ? 1 : i === 0
          ? smooth((position-.33)/.17)
          : 1-smooth((distance-.27)/.49);
        const value = opacity.toFixed(2);
        if (block.style.getPropertyValue('--ink') !== value) block.style.setProperty('--ink', value);
      });
      let focus = 0, phase = 0;
      for (let i = 1; i < centres.length; i++) {
        const between = (readLine - centres[i-1]) / Math.max(1, centres[i] - centres[i-1]);
        focus += smooth(between);
        phase += clamp(between);
      }
      const last = centres.length - 1;
      phase += Math.min(0,(readLine-centres[0]) / Math.max(1,centres[1]-centres[0]));
      phase += Math.max(0,(readLine-centres[last]) / Math.max(1,centres[last]-centres[last-1]));
      if (reduced.matches) { focus = 0; phase = 0; }
      if (progress === lastProgress && focus === pose.focus && phase === pose.turns) return;
      lastProgress = progress;
      pose.enter = smooth(progress);
      pose.focus = focus;
      pose.turns = phase;
      pose.passage = Math.sin(Math.PI * focus) ** 2;
      panel.style.setProperty('--aperture', String(pose.enter));
      if (art.dataset.fallback === 'true') {
        art.querySelectorAll<HTMLElement>('.water-fallback b').forEach((glyph,i)=>{
          const distance = i-focus;
          glyph.style.setProperty('--glyph-alpha', String(1 - pose.enter*smooth((Math.abs(distance)-.32)/.64)));
          glyph.style.setProperty('--glyph-offset', String(Math.max(-1,Math.min(1,distance))));
          const tilt = Math.max(-1,Math.min(1,phase-i));
          const turn = tilt < 0 ? -Math.pow(-tilt,2.35) : tilt;
          glyph.style.setProperty('--glyph-angle', (turn*210*pose.enter)+'deg');
          glyph.toggleAttribute('data-docked', pose.enter>.94 && Math.abs(distance)<.32);
        });
        art.style.setProperty('--letter-enter', String(pose.enter));
      }
      notes.forEach((note,i) => note.toggleAttribute('data-lit', i === Math.round(focus)));
    }

    function measure() {
      sectionTop = section.getBoundingClientRect().top + window.scrollY;

      blocks.forEach((block,i) => {
        const box = block.getBoundingClientRect();
        midpoints[i] = window.scrollY + box.top + box.height / 2;
        if (i > 0) centres[i-1] = midpoints[i];
      });
      travel = Math.max(1, centres[0] - sectionTop - window.innerHeight * .50);
      lastProgress = -1;
      paint();
    }
    const observer = new ResizeObserver(measure);
    [section, panel, ...blocks].forEach(el => observer.observe(el));
    reduced.addEventListener('change', measure);
    const unsubscribe = subscribeVisualScroll(paint);
    measure();
    return () => {
      disposed = true;
      unmount?.();
      observer.disconnect();
      nearHero.disconnect();
      unsubscribe();
      reduced.removeEventListener('change', measure);
    };
  }, []);

  return <section className="water-track" ref={track} id="top" aria-label="YEAH">
      <header className="water-nav">
        <a className="water-brand" href="#top">yeah<span>ayat</span><small>.dev</small></a>
        <nav aria-label={lang === 'kk' ? 'Негізгі мәзір' : 'Основное меню'}>
          <a href="#about">{labels.nav[0]}</a><a href="#cases">{labels.nav[1]}</a>
          <TransitionLink to="/contact">{labels.nav[2]}</TransitionLink><LanguageToggle /><ThemeToggle />
        </nav>
        <div className="letter-keyboard" role="group" aria-label={lang === 'kk' ? 'Су әріптері' : 'Водяные буквы'}>
          {letters.map((letter,index) => <button key={letter} type="button"
            aria-label={lang === 'kk' ? letter + ' әрпін толқындату' : 'Плеснуть водой в букве ' + letter}
            onClick={()=>stage.current?.dispatchEvent(new CustomEvent('letter-splash',{detail:index}))}>{letter}</button>)}
        </div>
      </header>
    <div className="water-frame" ref={frame}>
      <h1 className="water-sr">YEAH — {name}</h1>
      <div className="water-art" ref={stage} aria-hidden="true">
        <div className="water-fallback">{letters.map(letter => <b key={letter}><i>{letter}</i></b>)}</div>
      </div>
    </div>
    <div className="studio-notes" id="about">
      <header className="studio-author">
        <h2>{name}</h2>
        <p>{introduction}</p>
        <div className="author-links"><a href="#cases">{lang === 'kk' ? 'Жұмыстарымды көру' : 'Смотреть работы'} <span aria-hidden="true">↓</span></a>
          <TransitionLink to="/contact">{discuss}</TransitionLink></div>
      </header>
      <div className="letter-list">
        {labels.chapters.map(([title, description], i) =>
          <article className="letter-note" data-letter={letters[i]} key={letters[i]}>
            <div><small lang="en"><b>{letters[i]}</b><span>{principles[i]}</span></small><h3>{title}</h3><p>{description}</p></div>
          </article>)}
      </div>
    </div>
  </section>;
}
