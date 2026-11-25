import * as T from 'three';
import { PROJECTS } from '../data/projects';
import { screenPreview } from './screenImages';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Authored in Higgsfield 3D Jutsu. The six hinge tracks share a time axis
// so reversing a tap midway carries every leaf back from its current angle.
export async function loadGlassFolio(water: T.Material) {
  const asset = await new GLTFLoader().loadAsync('/environment/yeah-folio.glb');
  const group = asset.scene;
  // A printed plate on the fixed page remains readable while the leaves turn.
  const project=PROJECTS.find(item=>item.slug==='yeahgrind')!;
  const cover=new Image();
  cover.src=screenPreview(project.screens[0].src,480);
  let alive=true;
  let printed:T.CanvasTexture | undefined;
  const paperFace=new T.MeshBasicMaterial({color:0xe8eee6});
  const plate=new T.Mesh(new T.PlaneGeometry(.77,1.18),paperFace);
  plate.position.set(.44,0,-.029);
  group.add(plate);
  void cover.decode().then(()=>{
    if(!alive)return;
    const page=document.createElement('canvas');page.width=256;page.height=392;
    const ctx=page.getContext('2d');
    if(!ctx)return;
    ctx.fillStyle='#e8eee6';ctx.fillRect(0,0,256,392);
    ctx.fillStyle='#173449';ctx.font='600 37px sans-serif';ctx.fillText(project.title,14,73);
    ctx.drawImage(cover,14,100,228,228*cover.naturalHeight/cover.naturalWidth);
    ctx.fillStyle='#7c9b9e';
    for(const [i,width] of [196,155,183,98].entries())ctx.fillRect(17,250+i*18,width,3);
    printed=new T.CanvasTexture(page);printed.colorSpace=T.SRGBColorSpace;
    paperFace.color.set(0xffffff);paperFace.map=printed;paperFace.needsUpdate=true;
  }).catch(()=>{});
  const materials = new Set<T.Material>();
  const flat = new Map<T.Material,T.MeshBasicMaterial>();
  group.traverse(node => {
    if (!(node instanceof T.Mesh) || node===plate) return;
    const original = node.material as T.MeshStandardMaterial;
    materials.add(original);
    if (original.name === 'WaterCover') node.material = water;
    else {
      let shade = flat.get(original);
      if (!shade) {
        shade = new T.MeshBasicMaterial({color:original.color,side:T.DoubleSide});
        flat.set(original,shade);
      }
      node.material = shade;
    }
  });
  const mixer = new T.AnimationMixer(group);
  const duration = Math.max(...asset.animations.map(clip => clip.duration));
  for (const clip of asset.animations) {
    const action=mixer.clipAction(clip);
    action.setLoop(T.LoopOnce,1); action.clampWhenFinished=true; action.play();
  }
  let previous = -1;
  return { group, animate(_t:number,state:number) {
    if (previous===state) return;
    previous=state;
    for (const clip of asset.animations) mixer.clipAction(clip).paused=false;
    mixer.setTime(state * Math.max(0,duration-.0001));
    group.rotation.set(-.18,-.48+.32*state,-.075);
    group.position.x=-.39*(1-state);
  }, dispose() {
    alive=false;printed?.dispose();paperFace.dispose();
    mixer.stopAllAction();mixer.uncacheRoot(group);
    materials.forEach(material=>material.dispose());flat.forEach(material=>material.dispose());
  }};
}
