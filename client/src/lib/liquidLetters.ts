import { subscribeVisualScroll } from '../hooks/useScrollFeel';
import { createWaterLight } from './waterLight';
export { loadPanorama } from './waterLight';
import * as T from 'three';
import { prepareStroke } from './letterStrokes';
import { waterVolume } from './waterVolume';

// Hand-shaped in a common 650 × 366 drawing plane. The arched tips and
// tapered joins leave separate pools of water even as the glyphs rotate.
const silhouettes = [
  // Y: the short cupped arm feeds into a long, curling right stroke.
  [[10,96],[11,84],[24,78],[40,78],[54,86],[64,104],[70,123],
   [77,138],[87,145],[98,140],[107,122],[115,98],[126,76],
   [143,67],[158,70],[168,80],[169,94],[158,110],[142,127],
   [124,159],[107,189],[101,213],[103,237],[108,256],[105,272],
   [91,281],[73,282],[58,277],[52,264],[54,245],[61,218],
   [61,202],[54,182],[39,160],[25,137],[16,117]],
  // E: the mid-arm ends in a bead. Both bays stay open at oblique angles.
  [[161,258],[164,235],[167,199],[169,162],[173,122],[180,99],
   [194,85],[215,81],[238,84],[262,83],[278,78],[292,80],
   [301,90],[301,104],[293,118],[279,126],[257,125],[240,122],
   [222,126],[214,139],[214,152],[222,161],[237,163],[254,157],
   [265,155],[276,161],[280,174],[274,187],[260,194],[242,193],
   [226,196],[213,207],[207,222],[209,236],[219,244],[237,246],
   [258,241],[273,235],[283,238],[288,248],[283,261],[271,272],
   [248,279],[223,282],[199,281],[178,282],[166,275]],
  // A: an asymmetric arch and a broad, curved crossbar support the counter.
  [[296,263],[301,244],[314,213],[327,178],[340,140],[347,113],
   [355,92],[368,78],[385,75],[398,81],[407,97],[414,123],
   [424,152],[436,184],[450,215],[461,240],[467,259],[463,273],
   [447,279],[432,277],[421,266],[413,247],[403,233],[387,227],
   [369,229],[356,239],[347,259],[339,273],[327,280],[310,280],[301,275]],
  // H: two rising columns neck down into a gently sloping water bridge.
  [[471,115],[469,99],[474,88],[486,80],[501,79],[514,86],
   [520,98],[519,117],[521,140],[528,156],[539,163],[551,163],
   [564,156],[572,141],[578,121],[580,101],[588,86],[601,81],
   [617,82],[630,91],[634,105],[631,127],[624,158],[624,186],
   [629,219],[636,246],[637,263],[631,276],[617,282],[602,281],
   [590,274],[584,259],[583,237],[580,215],[573,203],[559,199],
   [545,203],[534,215],[529,234],[529,255],[525,273],[513,282],
   [496,284],[483,279],[475,268],[475,251],[480,224],[484,194],
   [482,163],[477,138]]
];
const units = 110;
const centerX = [92,232,380,550];
export type LetterPose = { turns: number; enter: number; focus: number; passage: number };

export function mountLiquidScene(host: HTMLDivElement, panorama: Awaited<ReturnType<typeof import('./waterLight').loadPanorama>>, pose: LetterPose) {
  const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  host.appendChild(renderer.domElement);
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(39,1,.03,120);
  const {water, uniforms, dispose}=createWaterLight(renderer,panorama);
  renderer.setClearColor(0,0);
  const plate=document.querySelector<HTMLElement>('.ocean-column');
  const image=plate?.querySelector('img');
  const scenePhoto=new T.Texture();
  scenePhoto.colorSpace=T.SRGBColorSpace;
  scenePhoto.minFilter=T.LinearFilter;
  scenePhoto.generateMipmaps=false;
  const optics={
    scenePhoto:{value:scenePhoto}, photoCrop:{value:new T.Vector4(0,0,1,1)},
    inverseBuffer:{value:new T.Vector2(1,1)}, hasScenePhoto:{value:0}
  };
  // Responsive image descriptors change naturalWidth to CSS pixels. Three
  // allocates its GPU storage from that value, so upload the same cached
  // source through an image with its original, unscaled pixel dimensions.
  let sourceURL='', alive=true;
  function uploadPhoto() {
    if (!image?.naturalWidth || sourceURL===image.currentSrc) return;
    sourceURL=image.currentSrc;
    const source=new Image();
    source.src=sourceURL;
    void source.decode().then(()=>{
      if (!alive || source.src!==sourceURL) return;
      scenePhoto.image=source;
      scenePhoto.needsUpdate=true;
      optics.hasScenePhoto.value=1;
      cropDirty=true;
      wake();
    }).catch(()=>{});
  }
  image?.addEventListener('load',uploadPhoto);
  uploadPhoto();
  let cropDirty=true;
  function measureCrop() {
    if(!plate || !image?.naturalWidth) return;
    const art=host.getBoundingClientRect(), world=plate.getBoundingClientRect();
    const aspect=image.naturalWidth/image.naturalHeight;
    const imageWidth=Math.max(world.width,world.height*aspect);
    const imageHeight=imageWidth/aspect;
    const left=world.left+(world.width-imageWidth)*(window.innerWidth<=700 ? .56 : .5);
    const top=world.top+(world.height-imageHeight)/2;
    optics.photoCrop.value.set((art.left-left)/imageWidth,1-(art.bottom-top)/imageHeight,
      art.width/imageWidth,art.height/imageHeight);
    cropDirty=false;
  }
  const impacts=silhouettes.map(()=>Array.from({length:3},()=>new T.Vector4(0,0,0,-100)));
  const nextImpact=[0,0,0,0];
  const localHit=new T.Vector3();
  let hoveredLetter=-1;
  const letters=silhouettes.map((outline,index)=>{
    const points=outline.map(([x,y])=>new T.Vector3((x-centerX[index])/units,(181-y)/units,0));
    const material=new T.ShaderMaterial({vertexShader:water.vertexShader,fragmentShader:water.fragmentShader,
      defines:{LETTER_WAVES:1},uniforms:{...uniforms,...optics,strokeTime:{value:-100},attention:{value:0},ripples:{value:impacts[index]}}});
    const mesh=new T.Mesh(waterVolume(points,material,34,index===2),material);
    mesh.position.x=(centerX[index]-325)/units;scene.add(mesh);return mesh;
  });
  const traceStroke=letters.map((letter,i)=>prepareStroke(letter.geometry,i,centerX[i]));
  // Even the largest droplet occupies only a few pixels of the scene.
  const sphere=new T.SphereGeometry(1,10,7);
  const groups=letters.map(mesh=>{
    const group=new T.Group();
    group.position.x=mesh.position.x;
    scene.add(group);group.attach(mesh);
    return group;
  });
  // Droplets follow the tips of the newly sculpted letters. Coordinates use
  // the same drawing plane as the outlines so the clusters retain their shape.
  const drops=[
    [0,12,64,.039],[0,2,56,.018],[0,95,294,.026],
    [1,287,64,.046],[1,302,51,.021],
    [2,393,58,.029],[2,457,286,.034],[2,467,295,.017],
    [3,621,66,.042],[3,633,59,.018],[3,511,300,.030],
  ].map(([index,x,y,radius],i)=>{
    const anchor=new T.Object3D();
    const baseY=(181-y)/units;
    anchor.position.set((x-centerX[index])/units,baseY,.08*Math.cos(i));
    anchor.scale.set(radius,radius*1.12,radius);
    groups[index].add(anchor);
    return {anchor,baseY};
  });
  const droplets=new T.InstancedMesh(sphere,water,drops.length);
  droplets.instanceMatrix.setUsage(T.DynamicDrawUsage);
  droplets.frustumCulled=false;
  scene.add(droplets);
  const particleCount=20;
  const spray=new T.InstancedMesh(sphere,water,particleCount);
  const particle=new T.Object3D();
  const velocities=Array.from({length:particleCount},()=>new T.Vector3());
  const origin=new T.Vector3();
  let impactTime=-10, struck=-1;
  spray.frustumCulled=false;
  spray.visible=false;
  scene.add(spray);
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  let visible=true, hover=false, raf=0, idleTimer=0, previous=0, time=0, depth=6, portrait=false;
  let pointerPending=false, pointerX=0, pointerY=0;
  let width=0, height=0, pixelRatio=0, quality=1, slowFrames=0, activeUntil=0;
  let lastQualityChange=0, lastFrameWasActive=false;
  let settledTurns=pose.turns, lastTurns=-1;
  let lastEnter=-1, lastFocus=-1, lastPassage=-1;
  const cursor=new T.Vector2(), ray=new T.Raycaster();
  const hits: T.Intersection[]=[];
  letters.forEach(letter=>letter.geometry.computeBoundingBox());

  function hitTest(){
    const rect=host.getBoundingClientRect();
    if(!rect.width || !rect.height)return;
    cursor.set((pointerX-rect.left)/rect.width*2-1,1-(pointerY-rect.top)/rect.height*2);
    ray.setFromCamera(cursor,camera);
    hits.length=0;
    const hit=ray.intersectObjects(letters,false,hits).find(hit=>hit.object.parent?.visible);
    hover=!!hit;
    hoveredLetter=hit?letters.indexOf(hit.object as typeof letters[number]):-1;
    if(hit) uniforms.pointer.value.set(hit.point.x,hit.point.y);
    return hit;
  }
  function move(e:PointerEvent){
    if(e.pointerType==='touch' || reduced.matches)return;
    pointerX=e.clientX; pointerY=e.clientY; pointerPending=true;
    wake();
  }
  let touch: {id:number;x:number;y:number} | null=null;
  function down(e:PointerEvent){
    if (e.pointerType==='touch') {
      touch=e.isPrimary ? {id:e.pointerId,x:e.clientX,y:e.clientY} : null;
    } else press(e);
  }
  function up(e:PointerEvent){
    if (touch?.id===e.pointerId && Math.hypot(e.clientX-touch.x,e.clientY-touch.y)<10) press(e);
    touch=null;
  }
  function cancelTouch(){touch=null;}
  function press(e:PointerEvent){
    if(!e.isPrimary || e.button!==0) return;
    pointerX=e.clientX; pointerY=e.clientY; pointerPending=false;
    const hit=hitTest();
    if(!hit) return;
    if(e.pointerType==='touch'){hover=false;hoveredLetter=-1;}
    splash(letters.indexOf(hit.object as typeof letters[number]),hit.point);
  }
  function keyboardSplash(event:Event) {
    const index=(event as CustomEvent<number>).detail;
    if (!Number.isInteger(index) || !letters[index]) return;
    const mesh=letters[index];
    // Strike an actual vertex on the glyph, including letters with an open counter.
    localHit.fromBufferAttribute(mesh.geometry.getAttribute('position'),0);
    splash(index,mesh.localToWorld(localHit));
  }
  function splash(index:number, point:T.Vector3) {
    window.dispatchEvent(new Event('water-splash'));
    host.dataset.touched='true';
    if(reduced.matches) return;
    impactTime=time;
    struck=index;
    origin.copy(point);
    letters[struck].worldToLocal(localHit.copy(origin));
    traceStroke[struck](localHit);
    letters[struck].material.uniforms.strokeTime.value=time;
    impacts[struck][nextImpact[struck]].set(localHit.x,localHit.y,localHit.z,time);
    nextImpact[struck]=(nextImpact[struck]+1)%3;
    velocities.forEach((v,i)=>{
      const theta=(i+Math.random()*.4)*Math.PI*2/particleCount;
      const speed=.66+Math.random()*1.25;
      v.set(Math.cos(theta)*speed,.6+Math.sin(theta)*speed,.35+Math.random()*.6);
    });
    wake();
  }
  function leave(){
    pointerPending=false;
    if(hover){hover=false; wake();}
  }
  function setResolution(){
    const budget=width<720 ? 610000 : 1450000;
    const capped=Math.min(devicePixelRatio, width<650 ? 1.2 : 1.35, Math.sqrt(budget/(width*height)));
    pixelRatio=Math.min(capped,Math.max(.65,capped*quality));
    renderer.setDrawingBufferSize(width,height,pixelRatio);
    optics.inverseBuffer.value.set(1/renderer.domElement.width,1/renderer.domElement.height);
    cropDirty=true;
  }
  let dockY = 0;
  function resize(){
    const w=host.clientWidth,h=host.clientHeight;
    if(!w || !h || (width===w && height===h))return;
    width=w; height=h; dockY=1-host.parentElement!.clientHeight/h; setResolution();
    portrait=w<=700;
    camera.aspect=w/h;
    depth=Math.max(2.95,3.27/(Math.tan(T.MathUtils.degToRad(19.5))*camera.aspect));
    camera.position.set(0,0,depth);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    wake();
  }
  function draw(now:number){
    raf=0;
    if(!visible || document.hidden)return;
    if(cropDirty) measureCrop();
    const elapsed=previous ? now-previous : 16;
    previous=now;
    const dt=Math.min(elapsed/1000,.12);
    // Only interactive, consecutive frames provide a useful GPU budget signal.
    // Downgrade after sustained misses; never oscillate between resolutions.
    if(lastFrameWasActive && now<activeUntil && quality>.58 && pixelRatio>.66){
      slowFrames=elapsed>32 ? slowFrames+1 : Math.max(0,slowFrames-1);
      if(slowFrames>=10 && now-lastQualityChange>2500){
        quality=Math.max(.58,quality*.79);
        slowFrames=0; lastQualityChange=now; setResolution();
      }
    }else slowFrames=0;
    if(!reduced.matches)time+=dt;
    uniforms.time.value=time;
    const age=time-impactTime;
    // Nested spray and satellite meshes do not inherit any letter impact.
    spray.visible=age>=0 && age<.86;
    if(spray.visible){
      velocities.forEach((v,i)=>{
        particle.position.copy(origin).addScaledVector(v,age);
        particle.position.y-=2.2*age*age;
        const radius=(.026+(i%3)*.012)*Math.min(1,age*26)*(1-age/.86);
        particle.scale.set(radius,radius*(1.4+Math.abs(v.y)*.4),radius);
        particle.updateMatrix();spray.setMatrixAt(i,particle.matrix);
      });
      spray.instanceMatrix.needsUpdate=true;
    }
    const {turns,enter,focus,passage}=pose;
    // Follow the finger immediately in position; let the angular motion settle separately.
    settledTurns=T.MathUtils.clamp(T.MathUtils.damp(settledTurns,turns,5.5,dt),turns-.12,turns+.12);
    if (reduced.matches) settledTurns=turns;
    lastTurns=turns; lastEnter=enter; lastFocus=focus; lastPassage=passage;
    const halfHeight=depth*Math.tan(T.MathUtils.degToRad(19.5));
    const halfWidth=halfHeight*camera.aspect;
    const scale=T.MathUtils.lerp(1,Math.min(halfHeight*.71,halfWidth*(portrait ? .34 : .42)),enter);
    uniforms.immersion.value=enter*(.27+.12*focus);
    letters.forEach((letter,i)=>{
      const attention=letter.material.uniforms.attention;
      attention.value=T.MathUtils.damp(attention.value,hover && i===hoveredLetter?1:0,10,dt);
    });
    // Each sculpture turns towards the reader on arrival and away on departure.
    // The centre of its reading interval is its frontal pose.
    groups.forEach((group,i)=>{
      // The reading aperture contains only the two adjacent sculptures during a turn.
      const distanceFromFocus=Math.abs(i-focus);
      const isolation=1-(1-enter)**2;
      const presence=1-isolation*T.MathUtils.smoothstep(distanceFromFocus,.40,.98);
      group.visible=presence>.002;
      const ownAge=time-impacts[i][(nextImpact[i]+2)%3].w;
      const spring=ownAge<1 ? Math.sin(ownAge*23)*Math.exp(-ownAge*6)*.21 : 0;
      const radius=scale*presence*(1-(portrait ? .06 : .24)*passage*enter);
      group.scale.set(radius*(1+spring*(i===0?1.3:.62)),radius*(1-spring*(i===3?1.4:1)),radius*(1+spring*.7));
      const rest=(centerX[i]-325)/units;
      const distance=T.MathUtils.clamp(i-focus,-1,1);
      // The active glyph docks beside its text. Incoming/outgoing glyphs
      // cross in depth and height within the same left-hand column.
      const dockX=portrait ? -.62 : -.49;
      const arc=passage*(1-Math.abs(distance)*.35);
      const tide=time*.76+i*.93;
      const drift=reduced.matches ? 0 : Math.sin(tide);
      const chapterX=halfWidth*(dockX + distance*(portrait ? .065 : .14));
      group.position.set(T.MathUtils.lerp(rest,chapterX,enter)+enter*halfWidth*.014*drift,
        .032*drift+enter*halfHeight*(dockY-distance*(portrait ? .66 : .92)+.019*drift),
        enter*halfHeight*(.08*Math.cos(tide)-.48*Math.abs(distance)));
      if(i===1)group.position.x+=spring*1.1;
      if(i===2 && ownAge<.7)group.position.y+=.26*Math.sin(Math.PI*ownAge/.7)**2;
      const tilt=T.MathUtils.clamp(settledTurns-i,-1,1);
      // Bank through the current while the glyph can be read. The deep part
      // of the turn happens on its way out, behind the arriving sculpture.
      const bank=tilt*(.76+1.45*T.MathUtils.smoothstep(Math.abs(tilt),.56,1));
      const roll=reduced.matches ? 0 : .42*Math.sin(tide*.71)+.09*Math.sin(tide*1.38);
      const angle=enter*(bank+roll)+.50*Math.sin(enter*Math.PI);
      group.rotation.set(
        .06*drift+enter*(.14*Math.sin(angle+i)+arc*.14),
        .13*drift+angle,
        .045*drift+enter*(.095*Math.sin(tide*.68+i)-distance*.115)+(i===3?spring:0)
      );
    });
    drops.forEach(({anchor,baseY},i)=>{anchor.position.y=baseY+.027*Math.sin(time*1.1+i);});
    uniforms.night.value=document.documentElement.dataset.theme==='dark'?1:0;
    scene.updateMatrixWorld();
    if(pointerPending){pointerPending=false; hitTest();}
    drops.forEach(({anchor},i)=>droplets.setMatrixAt(i,anchor.matrixWorld));
    droplets.instanceMatrix.needsUpdate=true;
    renderer.render(scene,camera);
    lastFrameWasActive=!reduced.matches && (now<activeUntil || age<1.65);
    if(reduced.matches)return;
    if(lastFrameWasActive)schedule();
    else idleTimer=window.setTimeout(()=>{idleTimer=0; schedule();}, Math.max(8,1000/25-(performance.now()-now)-8));
  }
  function schedule(){
    if(!raf && visible && !document.hidden)raf=requestAnimationFrame(draw);
  }
  function wake(){
    if(!visible || document.hidden)return;
    clearTimeout(idleTimer); idleTimer=0;
    activeUntil=performance.now()+240;
    schedule();
  }
  function resetClock(){
    clearTimeout(idleTimer); idleTimer=0;
    cancelAnimationFrame(raf); raf=0;
    previous=0; lastFrameWasActive=false; slowFrames=0;
    if(reduced.matches){
      impacts.forEach(slots=>slots.forEach(slot=>{slot.w=-100;}));
      impactTime=-10; hover=false; hoveredLetter=-1; pointerPending=false;
      letters.forEach(letter=>{letter.material.uniforms.attention.value=0;letter.material.uniforms.strokeTime.value=-100;});
    }
    wake();
  }
  const stopScroll=subscribeVisualScroll(()=>{
    cropDirty=true;
    if(pose.turns!==lastTurns || pose.enter!==lastEnter || pose.focus!==lastFocus || pose.passage!==lastPassage)wake();
  });
  const observer=new ResizeObserver(resize);observer.observe(host);
  const intersection=new IntersectionObserver(([entry])=>{
    visible=entry.isIntersecting && entry.intersectionRatio>0;
    resetClock();
  });
  intersection.observe(host);
  host.addEventListener('letter-splash',keyboardSplash);
  host.addEventListener('pointermove',move,{passive:true});host.addEventListener('pointerdown',down);host.addEventListener('pointerup',up);host.addEventListener('pointercancel',cancelTouch);host.addEventListener('pointerleave',leave);
  document.addEventListener('visibilitychange',resetClock);reduced.addEventListener('change',resetClock);
  const themeObserver=new MutationObserver(wake);
  themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  // Anchors need their latest world transforms before filling the instance buffer.
  // The root is always identity, so one explicit traversal is sufficient.
  scene.matrixWorldAutoUpdate=false;
  resize();
  return ()=>{
    alive=false;image?.removeEventListener('load',uploadPhoto);scenePhoto.dispose();
    stopScroll();clearTimeout(idleTimer);cancelAnimationFrame(raf);themeObserver.disconnect();observer.disconnect();intersection.disconnect();
    document.removeEventListener('visibilitychange',resetClock);reduced.removeEventListener('change',resetClock);
    host.removeEventListener('letter-splash',keyboardSplash);
    host.removeEventListener('pointermove',move);host.removeEventListener('pointerdown',down);host.removeEventListener('pointerup',up);host.removeEventListener('pointercancel',cancelTouch);host.removeEventListener('pointerleave',leave);
    letters.forEach(l=>{l.geometry.dispose();l.material.dispose();});droplets.dispose();sphere.dispose();
    spray.dispose();dispose();renderer.dispose();renderer.domElement.remove();
  };
}
