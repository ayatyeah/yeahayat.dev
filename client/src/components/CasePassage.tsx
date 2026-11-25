import { useEffect, useRef } from 'react';
import { PROJECTS } from '../data/projects';
import { screenPreview, screenSources } from '../lib/screenImages';
import { subscribeVisualScroll } from '../hooks/useScrollFeel';

const clamp = (n:number) => Math.max(0, Math.min(1,n));
const ease = (n:number) => n*n*(3-2*n);
const lerp = (a:number,b:number,t:number) => a+(b-a)*t;

export default function CasePassage() {
  const layer=useRef<HTMLDivElement>(null);
  const landing=PROJECTS[0].screens[0].src;
  useEffect(()=>{
    const overlay=layer.current!;
    const cases=overlay.parentElement!;
    const book=cases.querySelector<HTMLElement>('.folio-desk')!;
    const target=cases.querySelector<HTMLElement>('#case-yeahgrind .edition-screen')!;
    const cover=cases.querySelector<HTMLButtonElement>('.case-folio')!;
    const bookIcon=cases.querySelector<HTMLElement>('#case-yeahgrind .water-figure')!;
    const wheat=cases.querySelector<HTMLElement>('#case-shmagro .water-figure')!;
    const leaf=overlay.querySelector<HTMLElement>('.passage-leaf')!;
    const ray=overlay.querySelector<SVGPathElement>('.passage-ray')!;
    const line=overlay.querySelector<SVGPathElement>('.passage-filament')!;
    const glint=overlay.querySelector<SVGGElement>('.passage-glint')!;
    let rayPoints: DOMPoint[]=[];
    const reduce=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0, top=0, height=0, width=0;
    let source={x:0,y:0,w:0,h:0}, dest={...source}, stem=0, spine=0;
    let previous=-1, previousRay=-1;
    function draw(){
      if(!height || reduce.matches || document.hidden) return;
      const reading=window.scrollY-top+height*.52;
      const t=clamp((reading-source.y)/Math.max(1,dest.y-source.y));
      if(t!==previous) {
        previous=t;
        const moving=t>0 && t<1;
        cases.toggleAttribute('data-leaf-moving',moving);
        if(moving) {
          const alpha=Math.min(clamp(t/.085),clamp((1-t)/.085));
          const turn=ease(clamp(t/.80));
          // Interpolate the page in document coordinates: reverse scrolling
          // visits the very same hinge angles, sizes and positions.
          const x=lerp(source.x,dest.x,ease(t));
          const y=lerp(source.y,dest.y,t);
          const w=lerp(source.w,dest.w,turn), h=lerp(source.h,dest.h,turn);
          leaf.style.transform='translate3d('+x+'px,'+y+'px,0) rotate('+lerp(-7,0,turn)+'deg) scale('+w/dest.w+','+h/dest.h+')';
          leaf.style.opacity=String(alpha);
          leaf.style.setProperty('--hinge',(cover.getAttribute('aria-pressed')==='true' ? -145-turn*23 : -22-turn*146)+'deg');
          leaf.style.setProperty('--cover-alpha',String(1-ease(clamp((t-.55)/.35))));
          cover.style.setProperty('--book-visible',String(1-clamp(t/.085)));
          target.style.opacity=String(1-alpha);
        } else {
          cover.style.setProperty('--book-visible', t === 1 ? '0' : '1');
          target.style.removeProperty('opacity');
        }
      }
      const beam=clamp((reading-spine)/Math.max(1,stem-spine));
      if(beam!==previousRay) {
        previousRay=beam;
        const alpha=Math.min(clamp(beam/.07),clamp((1-beam)/.07));
        const index=beam*(rayPoints.length-1);
        const head=rayPoints[Math.floor(index)], next=rayPoints[Math.ceil(index)];
        if (head && next) {
          const f=index%1;
          glint.setAttribute('transform','translate('+lerp(head.x,next.x,f)+' '+lerp(head.y,next.y,f)+')');
        }
        glint.style.opacity=String(alpha);
        ray.style.opacity=String(alpha);
        ray.style.strokeDashoffset=String(.09-1.09*beam);
        line.style.opacity=String(.28*alpha);
        wheat.style.setProperty('--arrival-tilt',(Math.sin(clamp((beam-.76)/.24)*Math.PI*2)*-12*alpha)+'deg');
      }
    }
    function measure(){
      frame=0;
      const bounds=overlay.getBoundingClientRect();
      top=bounds.top+window.scrollY; width=bounds.width; height=innerHeight;
      function box(el:HTMLElement){
        const r=el.getBoundingClientRect();
        return {x:r.left-bounds.left+r.width/2,y:r.top-bounds.top+r.height/2,w:r.width,h:r.height};
      }
      source=box(book); dest=box(target);
      leaf.style.width=dest.w+'px';leaf.style.height=dest.h+'px';
      const a=box(bookIcon.querySelector('canvas')!), b=box(wheat.querySelector('canvas')!);
      spine=a.y; stem=b.y;
      const gutter=width-Math.max(16,width*.039);
      const d='M '+a.x+' '+a.y+' C '+(a.x+64)+' '+(a.y+48)+' '+gutter+' '+(a.y+15)+' '+gutter+' '+(a.y+(b.y-a.y)*.34)+' S '+gutter+' '+(b.y-26)+' '+b.x+' '+b.y;
      ray.setAttribute('d',d);line.setAttribute('d',d);
      const length=ray.getTotalLength();
      rayPoints=Array.from({length:81},(_,i)=>ray.getPointAtLength(i*length/80));
      previous=previousRay=-1;draw();
    }
    function queue(){if(!frame)frame=requestAnimationFrame(measure);}
    function mode(){
      cases.removeAttribute('data-leaf-moving');
      cover.style.removeProperty('--book-visible');target.style.removeProperty('opacity');
      wheat.style.removeProperty('--arrival-tilt');
      if(!reduce.matches)queue();
    }
    const resize=new ResizeObserver(queue);
    [cases,cover,target,bookIcon,wheat].forEach(el=>resize.observe(el));
    const stop=subscribeVisualScroll(draw);
    function toggle(){queue();}
    window.addEventListener('portfolio-folio',toggle);
    window.addEventListener('resize',queue);
    reduce.addEventListener('change',mode);
    mode();
    return ()=>{stop();resize.disconnect();cancelAnimationFrame(frame);reduce.removeEventListener('change',mode);
      window.removeEventListener('resize',queue);window.removeEventListener('portfolio-folio',toggle);
      cases.removeAttribute('data-leaf-moving');cover.style.removeProperty('--book-visible');target.style.removeProperty('opacity');};
  },[]);
  return <div className="case-passage" ref={layer} aria-hidden="true">
    <div className="passage-leaf"><div className="passage-page">
      <img src={screenPreview(landing,800)} srcSet={screenSources(landing)} sizes="(max-width:700px) 82vw, 44vw" loading="lazy" decoding="async" alt="" />
      <i className="passage-cover" />
    </div></div>
    <svg width="100%" height="100%" focusable="false">
      <defs><radialGradient id="caustic-glow"><stop stopColor="#fffbd9"/><stop offset=".26" stopColor="#ffedaa" stopOpacity=".85"/><stop offset="1" stopColor="#76dce9" stopOpacity="0"/></radialGradient></defs>
      <path className="passage-filament" fill="none" />
      <path className="passage-ray" fill="none" pathLength="1" strokeDasharray=".09 1.1" />
      <g className="passage-glint">
        <circle r="16" fill="url(#caustic-glow)"/>
        <path d="M0 -11 Q1 -2 9 0 Q1 1 0 12 Q-1 1 -8 0 Q-1 -1 0 -11" fill="#fffce4"/>
      </g>
    </svg>
  </div>;
}
