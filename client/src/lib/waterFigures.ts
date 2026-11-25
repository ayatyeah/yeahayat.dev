import * as T from 'three';
import { scenePaused, watchSceneVisibility } from './sceneVisibility';
import { createWaterLight,loadPanorama } from './waterLight';
import { waterObject } from './waterTools';

export async function mountFigures(buttons:HTMLButtonElement[],signal:AbortSignal){
  if(!buttons.length || signal.aborted)return;
  const sky=await loadPanorama();
  if(signal.aborted){sky.dispose();return;}
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true});
  const {water,uniforms,dispose}=createWaterLight(renderer,sky);
  const widths=new Map<HTMLButtonElement,number>();
  let bufferSize=1;
  renderer.setSize(1,1,false);
  renderer.setScissorTest(true);
  const camera=new T.PerspectiveCamera(31,1,.1,20);camera.position.z=3.85;
  const scene=new T.Scene();
  const chunks=new Map<HTMLButtonElement,{model:ReturnType<typeof waterObject>; pivot:T.Group; ctx:CanvasRenderingContext2D; hit:number; toggle:number; from:number; state:number; startTurn:number; turn:number; scroll:number; targetScroll:number}>();
  const visible=new Set<HTMLButtonElement>();
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  let raf=0, timer=0, last=-Infinity;
  let scrollDirty=false;
  function releaseModel(model: ReturnType<typeof waterObject>) {
    const geometries=new Set<T.BufferGeometry>();
    model.group.traverse(node=>{
      if(node instanceof T.Mesh)geometries.add(node.geometry);
      if(node instanceof T.InstancedMesh)node.dispose();
    });
    geometries.forEach(geometry=>geometry.dispose());
    model.dispose();
  }
  async function replaceBook(button:HTMLButtonElement) {
    const {loadGlassFolio}=await import('./glassFolio');
    if(signal.aborted)return;
    const book=await loadGlassFolio(water);
    const current=chunks.get(button);
    if(signal.aborted || !current){releaseModel(book);return;}
    current.pivot.remove(current.model.group);
    releaseModel(current.model);
    current.model=book;
    current.pivot.add(book.group);
    button.dataset.bookModel='folio';
    schedule();
  }
  function draw(now:number){
    raf=0;
    if(scenePaused() || !visible.size)return;
    const dt=Math.min(.12,(now-last)/1000);
    last=now;
    uniforms.night.value=document.documentElement.dataset.theme==='dark'?1:0;
    const time=reduced.matches?0:now/1000;
    uniforms.time.value=time;
    // Read visible bounds together once per rendered frame. The document
    // can receive several native or smoothed scroll updates in that time.
    if (scrollDirty && !reduced.matches) visible.forEach(measure);
    scrollDirty=false;
    let moving=false;
    for(const button of visible){
      let obj=chunks.get(button);
      if(!obj){
        const canvas=button.querySelector('canvas')!;
        const ctx=canvas.getContext('2d');if(!ctx)continue;
        const model=waterObject(button.dataset.waterFigure!,water);
        const pivot=new T.Group();pivot.add(model.group);scene.add(pivot);
        const initial = button.getAttribute('aria-expanded') === 'true' ? 1 : 0;
        obj={model,pivot,ctx,hit:-10000,toggle:initial,from:initial,state:initial,startTurn:0,turn:0,scroll:0,targetScroll:0};chunks.set(button,obj);
        if(button.dataset.waterFigure==='yeahgrind')void replaceBook(button).catch(()=>{});
        if(!reduced.matches)measure(button);
      }
      const {pivot,ctx}=obj;
      const age=(now-obj.hit)/1000;
      const book = button.dataset.waterFigure === 'yeahgrind';
      const duration=book ? 1.85*Math.max(.14,Math.abs(obj.from-obj.toggle)) : 1.35;
      const t=reduced.matches?1:Math.min(1,age/duration);
      const blend=book ? t : T.MathUtils.smootherstep(t,0,.76);
      obj.state=T.MathUtils.lerp(obj.from,obj.toggle,blend);
      if(obj.hit>=0) obj.turn=obj.startTurn+T.MathUtils.smootherstep(t,0,1);
      // With reduced motion a tap can hold the gesture's expressive pose.
      // Hinged, indexed and locking objects already have two stable poses.
      const hold=reduced.matches && obj.toggle===1 &&
        !book && button.dataset.waterFigure!=='ddc' && button.dataset.waterFigure!=='blcsoftsale';
      obj.model.animate(hold ? .22 : t,obj.state,obj.turn);
      obj.scroll=reduced.matches?0:T.MathUtils.damp(obj.scroll,obj.targetScroll,7,dt);
      moving ||= t < 1 || Math.abs(obj.scroll-obj.targetScroll)>.01;
      pivot.visible=true;
      pivot.rotation.set(.09*Math.sin(time*.78)-obj.scroll*.12,.16+.18*Math.sin(time*.72)+obj.scroll*.32,.032*Math.sin(time));
      pivot.position.y=.035*Math.sin(time*.85)+obj.scroll*.085;
      uniforms.age.value=reduced.matches || book ? -1 : age;
      const pixels=Math.max(1,Math.min(256,Math.ceil((widths.get(button) || 96)*Math.min(devicePixelRatio,1.5))));
      if(pixels>bufferSize){
        bufferSize=pixels;
        renderer.setSize(bufferSize,bufferSize,false);
      }
      if(ctx.canvas.width!==pixels||ctx.canvas.height!==pixels)ctx.canvas.width=ctx.canvas.height=pixels;
      renderer.setViewport(0,0,pixels,pixels);
      renderer.setScissor(0,0,pixels,pixels);
      renderer.render(scene,camera);
      ctx.globalCompositeOperation='copy';
      ctx.drawImage(renderer.domElement,0,bufferSize-pixels,pixels,pixels,0,0,pixels,pixels);
      pivot.visible=false;
    }
    if(!reduced.matches) {
      // Let the browser sleep between refraction updates. A gesture or
      // scroll requests its first frame immediately, including during idle.
      timer=window.setTimeout(()=>{timer=0;schedule();},moving ? 20 : 110);
    }
  }
  function schedule(){
    clearTimeout(timer);
    if (scenePaused() || !visible.size) {
      cancelAnimationFrame(raf); raf=0; last=-Infinity;
      return;
    }
    if(!raf)raf=requestAnimationFrame(draw);
  }
  function measure(button:HTMLButtonElement){
    const obj=chunks.get(button);
    if(!obj)return;
    const box=button.getBoundingClientRect();
    obj.targetScroll=T.MathUtils.clamp(1-2*(box.top+box.height*.5)/innerHeight,-1,1);
  }
  function scroll(){
    if (!visible.size || reduced.matches) return;
    scrollDirty=true;
    schedule();
  }
  window.addEventListener('scroll',scroll,{passive:true});
  window.addEventListener('resize',scroll);
  const io=new IntersectionObserver(entries=>{
    for(const e of entries){
      const el=e.target as HTMLButtonElement;
      if(e.isIntersecting){visible.add(el);scrollDirty=true;}else visible.delete(el);
    }
    schedule();
  });
  function splash(e:Event){
    const obj=chunks.get(e.currentTarget as HTMLButtonElement);
    if(!obj)return;
    obj.from=obj.state;obj.toggle=1-obj.toggle;obj.startTurn=obj.turn;
    obj.hit=performance.now();window.dispatchEvent(new Event('water-splash'));schedule();
  }
  const resize=new ResizeObserver(entries=>{
    for(const entry of entries)widths.set(entry.target.parentElement as HTMLButtonElement,entry.contentRect.width);
    schedule();
  });
  buttons.forEach(b=>{io.observe(b);resize.observe(b.querySelector('canvas')!);b.addEventListener('click',splash);});
  const theme=new MutationObserver(schedule);theme.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  const unwatch=watchSceneVisibility(schedule);reduced.addEventListener('change',schedule);
  signal.addEventListener('abort',()=>{
    cancelAnimationFrame(raf);clearTimeout(timer);window.removeEventListener('scroll',scroll);window.removeEventListener('resize',scroll);io.disconnect();resize.disconnect();theme.disconnect();unwatch();reduced.removeEventListener('change',schedule);
    buttons.forEach(b=>b.removeEventListener('click',splash));
    chunks.forEach(({model})=>releaseModel(model));dispose();renderer.dispose();renderer.forceContextLoss();
  },{once:true});
}
