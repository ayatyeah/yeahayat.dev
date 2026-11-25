import { useEffect, useRef } from 'react';
import { scenePaused, watchSceneVisibility } from '../lib/sceneVisibility';
import { subscribeVisualScroll } from '../hooks/useScrollFeel';

// Offsets within the shoal, body length, and individual swimming phase.
const fish = [
  [-85, -8, 22, .8], [-67, 18, 25, 4.2], [-52, -26, 28, 2],
  [-36, 2, 30, 5.1], [-14, 24, 32, 1.8], [-10, -15, 38, 3.7],
  [18, 4, 41, 0], [38, -19, 26, 4.8], [58, -4, 34, 2.7],
] as const;
const smooth = (t: number) => t*t*(3-2*t);

export default function OceanSchool() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    if (!ctx) return;
    const water = canvas.parentElement!;
    let width = 1, height = 1, scale = 1, x = 0, y = 0, strength = 0;
    let frame = 0, last = 0, elapsed = 0;
    let depth = 0;
    const flank = ctx.createLinearGradient(0,-.19,0,.19);
    flank.addColorStop(0,'#275677');
    flank.addColorStop(.32,'#427b97');
    flank.addColorStop(.57,'#b4e7e8');
    flank.addColorStop(.77,'#f3ffff');
    flank.addColorStop(1,'#5999ae');

    function paint(now: number) {
      frame = 0;
      if (!strength || scenePaused() || !ctx || reduced.matches) return;
      if (!last || now-last >= 39) {
        elapsed += last ? Math.min(100,now-last)/1000 : 0;
        last = now;
        const orbit = elapsed*.14 + depth*.17;
        const heading = Math.cos(orbit);
        const bank = Math.sin(orbit);
        const cx = x + Math.sin(orbit)*Math.min(width*.025,32);
        const cy = y + Math.cos(orbit)*9;
        canvas.style.transform = `translate3d(${(cx-130*scale).toFixed(1)}px,${(cy-60*scale).toFixed(1)}px,0) scale(${scale})`;
        ctx.setTransform(1,0,0,1,0,0);
        ctx.clearRect(0,0,canvas.width,canvas.height);
        const dpr = canvas.width/260;
        ctx.setTransform(dpr,0,0,dpr,130*dpr,60*dpr);
        for (const [dx,dy,length,phase] of fish) {
          const beat = Math.sin(elapsed*3.3+phase);
          const turn = Math.tanh(heading*3 + Math.sin(phase)*.2);
          ctx.save();
          ctx.translate(dx*(.65+.35*Math.abs(turn))+beat*1.5,dy+Math.sin(elapsed*1.3+phase)*2+dx*bank*.12);
          ctx.rotate(.12*bank*turn + beat*.035);
          ctx.scale(length*turn,length);
          ctx.globalAlpha = .66 + (length-22)*.015;
          ctx.fillStyle = '#669db0';
          ctx.beginPath();
          ctx.moveTo(-.36,0);
          ctx.lineTo(-.68+.08*beat,-.21);
          ctx.lineTo(-.56+.09*beat,0);
          ctx.lineTo(-.70+.08*beat,.18);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle=flank;
          ctx.beginPath();
          ctx.moveTo(.53,-.025);
          ctx.bezierCurveTo(.34,-.21,.06,-.18,-.43,-.038);
          ctx.lineTo(-.46,.034);
          ctx.bezierCurveTo(-.08,.09,.20,.25,.53,-.025);
          ctx.fill();
          ctx.fillStyle='#234c69';
          ctx.beginPath();
          ctx.arc(.36,-.054,.026,0,2*Math.PI);
          ctx.fill();
          ctx.restore();
        }
      }
      frame=requestAnimationFrame(paint);
    }

    function position() {
      depth = window.scrollY / Math.max(1,height);
      strength = reduced.matches ? 0 : smooth(Math.max(0,Math.min(1,(depth-1.2)/1.3)));
      canvas.style.opacity=String(strength*(width<700 ? .53 : .67));
      // The shoal keeps its own lane in world space as the reader descends.
      x = width*(width<700 ? .082 : .106);
      y = height*(.68 + Math.sin(depth*.49)*.12);
      if (!frame && strength && !scenePaused()) frame=requestAnimationFrame(paint);
      if (!strength) last=0;
    }
    function measure() {
      width=water.clientWidth;
      height=water.clientHeight;
      scale=width<700 ? Math.min(.44,width/1010) : Math.min(.85,width/1330);
      const dpr=Math.min(1.5,devicePixelRatio);
      canvas.width=Math.ceil(260*dpr);
      canvas.height=Math.ceil(120*dpr);
      position();
    }
    function visibility() {
      cancelAnimationFrame(frame);
      frame=0; last=0;
      position();
    }
    const sizes=new ResizeObserver(measure);
    sizes.observe(water);
    sizes.observe(document.body);
    const stop=subscribeVisualScroll(position);
    reduced.addEventListener('change',visibility);
    const unwatch=watchSceneVisibility(visibility);
    measure();
    return ()=>{
      sizes.disconnect(); stop(); cancelAnimationFrame(frame);
      reduced.removeEventListener('change',visibility);
      unwatch();
    };
  },[]);
  return <canvas ref={ref} className="ocean-school" aria-hidden="true" />;
}
