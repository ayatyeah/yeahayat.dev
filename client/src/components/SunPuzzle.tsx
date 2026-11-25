import {useLang} from '../lib/language';
import {useEffect, useState, type CSSProperties} from 'react';
import {getSelectedCase, selectCase, useSelectedCase} from '../lib/selectedCase';
import {PROJECTS} from '../data/projects';
import LightPrint from './LightPrint';
import '../styles/sunPuzzle.css';

type Point = [number,number];
type Field = {start:number; end:number; prisms:Point[]; initial:number};
// Each socket has two positions. A set bit means a descending diagonal.
const fields:Field[]=[
  {start:2,end:0,prisms:[[1,2],[1,0],[3,1]],initial:3},
  {start:0,end:3,prisms:[[3,0],[3,3],[1,2],[4,2]],initial:0},
  {start:3,end:2,prisms:[[0,3],[0,0],[3,0],[3,2],[2,1]],initial:19},
  {start:1,end:0,prisms:[[0,1],[0,3],[2,3],[2,0],[4,2]],initial:12},
  {start:0,end:3,prisms:[[1,0],[1,2],[3,2],[3,3],[0,3],[4,1]],initial:16},
  {start:3,end:0,prisms:[[0,3],[0,1],[2,1],[2,2],[4,2],[4,0]],initial:51}
];
// Each solved field opens the actual screen that demonstrates its outcome.
const outcomes: Record<string, {screen:number; ru:string; kk:string; mark:string}> = {
  yeahgrind: {screen:3,ru:'От урока к самопроверке',kk:'Сабақтан өзін-өзі тексеруге',mark:'M0 8 Q-7 2 -14 4 V-10 Q-6 -12 0 -6 Q7 -12 14 -10 V4 Q6 2 0 8 V-6'},
  shmagro: {screen:2,ru:'Из каталога техники в заявку',kk:'Техника каталогынан өтінімге',mark:'M0 14 Q3 0 1 -16 M1 7 Q-8 6 -9 -2 Q-3 -2 1 4 M2 0 Q11 -2 10 -10 Q4 -9 2 -3 M2 -5 Q-5 -8 -5 -13 Q0 -12 2 -8'},
  studyloop: {screen:4,ru:'От теста к результату',kk:'Тесттен нәтижеге',mark:'M8 -7 A11 11 0 1 0 11 2 M8 -14 V-6 H0'},
  clicki: {screen:2,ru:'Открыть профиль автора',kk:'Автор профилін ашу',mark:'M-3 4 L-6 7 A5 5 0 0 1 -13 0 L-5 -8 A5 5 0 0 1 2 -6 M3 -4 L6 -7 A5 5 0 0 1 13 0 L5 8 A5 5 0 0 1 -2 6'},
  ddc: {screen:2,ru:'Войти в портал сотрудников',kk:'Қызметкерлер порталын көру',mark:'M0 -13 L12 -6 V7 L0 13 L-12 7 V-6 Z M-12 -6 L0 0 L12 -6 M0 0 V13'},
  blcsoftsale: {screen:2,ru:'Найти производителя программы',kk:'Бағдарлама өндірушісін табу',mark:'M-2 -2 A6 6 0 1 0 -7 2 L4 13 L9 8 L7 6 L5 8 Z'}
};
function trace(field:Field, mask:number){
  let x=-1,y=field.start,dx=1,dy=0;
  const points: Point[] = [[8, 50 + y * 100]];
  const arrivals = new Map<number, number>();
  let distance = 0;
  function extend(px: number, py: number) {
    const [lastX, lastY] = points[points.length - 1];
    distance += Math.abs(lastX - px) + Math.abs(lastY - py);
    points.push([px, py]);
  }
  function finish(won: boolean) {
    return { points: points.map(point => point.join(',')).join(' '), arrivals, distance, won };
  }
  const visited=new Set<number>();
  while(true){
    x+=dx;y+=dy;
    if(x<0||x>=5||y<0||y>=4){
      const won = x === 5 && y === field.end;
      const endX = won ? 581 : Math.max(8,Math.min(592,(x+1)*100));
      extend(endX, Math.max(0, Math.min(400, 50 + y * 100)));
      return finish(won);
    }
    const prism=field.prisms.findIndex(([a,b])=>x===a&&y===b);
    if(prism<0)continue;
    extend((x + 1) * 100, 50 + y * 100);
    if (!arrivals.has(prism)) arrivals.set(prism, distance);
    const state=(x+5*y)*4+(dx===1?0:dx===-1?1:dy===1?2:3);
    if(visited.has(state))return finish(false);
    visited.add(state);
    const sign=mask&(1<<prism)?1:-1;
    [dx,dy]=[dy*sign,dx*sign];
  }
}

type Records=Record<string,number>;
const recordKey='yeahayat.sun-records.v1';
function records():Records{
  try{
    const saved=JSON.parse(localStorage.getItem(recordKey)||'{}');
    return Object.fromEntries(Object.entries(saved).filter(([k,v])=>PROJECTS.some(p=>p.slug===k)&&typeof v==='number'&&Number.isInteger(v)&&v>0)) as Records;
  }catch{return {};}
}

type Attempt = { mask: number; moves: number };
type Attempts = Record<string, Attempt>;
const progressKey = 'yeahayat.sun-attempts.v1';
function readAttempts(): Attempts {
  const attempts: Attempts = {};
  try {
    const saved = JSON.parse(sessionStorage.getItem(progressKey) || '{}');
    PROJECTS.forEach(({slug}, index) => {
      const attempt = saved?.[slug];
      if (Number.isInteger(attempt?.mask) && attempt.mask >= 0 && attempt.mask < 2 ** fields[index].prisms.length &&
          Number.isInteger(attempt.moves) && attempt.moves >= 0) attempts[slug] = attempt;
    });
  } catch { /* Storage is optional. */ }
  return attempts;
}

export default function SunPuzzle(){
  const kk=useLang()==='kk';
  const [playing,setPlaying] = useState(() => window.location.hash === '#light-game');
  useEffect(() => {
    const linked = () => { if (window.location.hash === '#light-game') setPlaying(true); };
    window.addEventListener('hashchange', linked);
    return () => window.removeEventListener('hashchange', linked);
  }, []);
  const [best,setBest]=useState(records);
  const active = useSelectedCase();
  const [first] = useState(() => PROJECTS.find(p => !best[p.slug]) ?? PROJECTS[0]);
  const project = active ?? first;
  const index = PROJECTS.indexOf(project), field = fields[index];
  const [attempts, setAttempts] = useState(readAttempts);
  const { mask, moves } = attempts[project.slug] ?? { mask: field.initial, moves: 0 };
  const [echo, setEcho] = useState({slug: '', ray: ''});
  const previousRay = echo.slug === project.slug ? echo.ray : '';

  useEffect(() => {
    const linked = window.location.hash === '#light-game' &&
      PROJECTS.find(p => p.slug === new URLSearchParams(window.location.search).get('field'));
    if (linked) selectCase(linked.slug);
    else if (!getSelectedCase()) selectCase(first.slug, { automatic: true });
  }, [first]);

  function saveAttempt(mask: number, moves: number) {
    const updated = { ...attempts, [project.slug]: { mask, moves } };
    setAttempts(updated);
    try { sessionStorage.setItem(progressKey, JSON.stringify(updated)); } catch { /* Keep the current visit in memory. */ }
  }
  const [release, setRelease] = useState('');
  useEffect(() => {
    if (!release) return;
    const timer = window.setTimeout(() => setRelease(''), 2100);
    return () => window.clearTimeout(timer);
  }, [release]);

  const {points, won, arrivals, distance} = trace(field, mask);
  const travelTime = Math.round(Math.max(350, Math.min(1050, distance * .86)));
  const outcome = outcomes[project.slug];
  const receiverY = 50 + field.end * 100;
  const releasing = won && release === project.slug;
  const outlet = `M581 ${receiverY} C581 ${receiverY + (400 - receiverY) * .57} 510 370 469 396`;
  function turn(i:number){
    if(won)return;
    const next=mask^(1<<i), count=moves+1;
    const nextTrace = trace(field,next);
    if (nextTrace.points !== points) setEcho({slug: project.slug, ray: points});
    saveAttempt(next, count);
    if(nextTrace.won){
      window.dispatchEvent(new CustomEvent('portfolio-light-caught', {detail: {slug: project.slug}}));
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setRelease(project.slug);
      const saved={...best,...records()};
      saved[project.slug]=Math.min(saved[project.slug]??Infinity,count);
      setBest(saved);
      try{localStorage.setItem(recordKey,JSON.stringify(saved));}catch{/* Session-only play. */}
    }
  }
  function open(i: number) {
    if (i !== index) setEcho({slug: '', ray: ''});
    selectCase(PROJECTS[i].slug);
  }
  function reset() {
    setRelease('');
    setEcho({slug: '', ray: ''});
    saveAttempt(field.initial, 0);
  }
  return <section className="sun-lab" id="light-game" aria-labelledby="sun-title">
    <div className="sun-invitation">
      <span className="sun-optic" aria-hidden="true"><i /></span>
      <div><h2 id="sun-title">{kk ? 'Сәулені ұстаңыз' : 'Поймайте свет'}</h2>
        <p>{kk ? 'Су мен шыныдан жасалған шағын ойын. Призмаларды бұрып, сәулені тамшыға жеткізіңіз.' : 'Маленькая игра с водой и стеклом. Поворачивайте призмы, пока луч не попадёт в каплю.'}</p>
      </div>
      <button className="sun-start" type="button" aria-expanded={playing} aria-controls="sun-console" onClick={()=>setPlaying(!playing)}>
        {kk ? (playing ? 'Жинау' : 'Ойнау') : (playing ? 'Свернуть' : 'Сыграть')} <span aria-hidden="true">{playing ? '−' : '+'}</span>
      </button>
    </div>
    <div id="sun-console" hidden={!playing}>
    <div className="sun-copy">
      <div className="sun-levels" aria-label={kk?'Алаңды таңдау':'Выбор поля'}>{fields.map((_,i)=><button type="button" key={i} onClick={()=>open(i)} aria-label={(kk?'Алаң ':'Поле ')+(i+1)+', '+PROJECTS[i].title} aria-pressed={i===index}>{best[PROJECTS[i].slug]?'✓ ':''}{String(i+1).padStart(2,'0')}</button>)}</div>
      <small>{kk?'Аяқталған алаңдар':'Пройдено'} · {Object.keys(best).length} / {fields.length}</small>
    </div>
    <div className="sun-instrument">
      <div className="sun-readout"><strong>{project.title}</strong><span>{kk?'Қадамдар':'Ходы'} · {moves}</span></div>
      <div className="sun-board" data-solved={won}
        style={{ '--ray-time': travelTime + 'ms' } as CSSProperties}>
        <svg viewBox="0 0 600 400" aria-hidden="true">
          <defs><pattern id="socket-grid" width="50" height="50" patternUnits="userSpaceOnUse"><circle r="1.6" cx="0" cy="0" fill="#9ececd"/></pattern></defs>
          <rect width="600" height="400" fill="url(#socket-grid)"/>
          {previousRay && <polyline key={'echo-'+points} points={previousRay} className="sun-ray-echo" />}
          <polyline points={points} className="sun-glow"/>
          <polyline key={'path-' + points} points={points} pathLength="1"
            className={previousRay ? 'sun-ray sun-ray-writing' : 'sun-ray'}/>
          {previousRay && [...arrivals].map(([socket, at]) => {
            const [x, y] = field.prisms[socket];
            return <ellipse key={points + socket} className="sun-strike"
              cx={(x + 1) * 100} cy={50 + y * 100} rx="17" ry="17"
              style={{animationDelay: Math.round(at / distance * travelTime) + 'ms'}}/>;
          })}
          {previousRay && !won && <polyline key={points} points={points} className="sun-travelling-ray" pathLength="1" />}
          {releasing && <>
            <polyline points={points} className="sun-catch-pulse" pathLength="1" />
            <path d={outlet} className="sun-outlet" pathLength="1"/>
            <ellipse cx="469" cy="396" rx="23" ry="5" className="sun-water-ring"/>
          </>}
          <circle cx="8" cy={50+field.start*100} r="9" fill="#fff4ae"/>
          <g transform={'translate(581 '+(50+field.end*100)+')'}>{won ? <path d={outcome.mark} fill="none" stroke="#ffe6a7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M0 -17 Q-20 4 -10 13 Q0 24 10 13 Q21 4 0 -17Z" fill={won?'#ffd27a':'#73d9ec'} stroke="#e8ffff" strokeWidth="2"/>}{releasing && <circle className="sun-ripple" r="18" />}</g>
        </svg>
        {field.prisms.map(([x,y],i)=><button key={x+','+y} type="button" className="sun-socket" data-lit={arrivals.has(i)} style={{left:((x+1)/6*100)+'%',top:((y+.5)/4*100)+'%'}} aria-label={kk?(i+1)+'-призманы бұру':'Повернуть призму '+(i+1)} aria-pressed={Boolean(mask&(1<<i))} aria-disabled={won} onClick={()=>turn(i)}><i/><span className="sun-bearing" aria-hidden="true"/></button>)}
      </div>
      <div className="sun-status" role="status">{won?(kk?'Сәуле тамшыға жетті!':'Свет пойман!'):((kk?'Алаң ':'Поле ')+(index+1)+' / '+fields.length)}{best[project.slug]&&<small>{kk?'Үздік нәтиже':'Лучший результат'} · {best[project.slug]}</small>}</div>
      <div className="sun-actions">{won?<><LightPrint title={project.title} slug={project.slug} points={points} kk={kk} /><a href={'/work/'+project.slug+'?screen='+outcome.screen+'#featured-case'}>{kk ? outcome.kk : outcome.ru} ↗</a><button type="button" onClick={()=>open((index+1)%fields.length)}>{kk?'Келесі алаң':'Следующее поле'} →</button></>:<a href={'#case-'+project.slug}>{kk?'Жобаға өту':'К проекту'} ↑</a>}<button type="button" onClick={reset}>{kk?'Қайта бастау':'Сбросить'}</button></div>
    </div>
    </div>
  </section>;
}
