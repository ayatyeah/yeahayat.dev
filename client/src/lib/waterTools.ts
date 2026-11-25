import * as T from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { waterVolume } from './waterVolume';

export function waterObject(kind:string, water:T.Material){
  const group=new T.Group();
  const ownedMaterials: T.Material[] = [];
  const ownedTextures: T.Texture[] = [];
  // t runs from zero to one per gesture. state eases between two resting poses.
  let animate: (t:number,state:number,turn:number)=>void = ()=>{};
  const smooth=(t:number)=>T.MathUtils.smoothstep(t,0,1);
  const pulse=(t:number)=>smooth(t/.28)*(1-smooth((t-.40)/.60));
  const cast=(points:number[][])=>new T.Mesh(waterVolume(points.map(([x,y])=>new T.Vector3(x,y,0)),water,30),water);
  const ring=(radius:number,width:number,arc=Math.PI*2)=>new T.Mesh(new T.TorusGeometry(radius,width,9,36,arc),water);
  const rod=(a:T.Vector3,b:T.Vector3,r:number)=>{
    const delta=b.clone().sub(a);
    const mesh=new T.Mesh(new T.CapsuleGeometry(r,delta.length(),3,9),water);
    mesh.position.copy(a).lerp(b,.5);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
    return mesh;
  };
  if(kind==='cursor'){
    group.add(cast([[-.49,.76],[-.44,-.57],[-.14,-.31],[.1,-.74],[.32,-.61],[.09,-.18],[.49,-.15]]));
    animate=t=>{
      const jab=pulse(t);
      group.position.set(-.19*jab,.25*jab,-.15*jab);
      group.rotation.x=-.62*jab;
    };
  }else if(kind==='code'){
    const left=cast([[-.30,.49],[-.84,.10],[-.84,-.09],[-.30,-.49],[-.20,-.30],[-.54,0],[-.20,.30]]);
    const right=left.clone();right.rotation.y=Math.PI;
    const slash=cast([[-.24,-.55],[-.04,-.55],[.26,.55],[.06,.55]]);
    group.add(left,right,slash);
    animate=t=>{
      const open=pulse(t);
      left.position.x=-.17*open;right.position.x=.17*open;
      slash.rotation.y=Math.PI*2*smooth(t);
    };
  }else if(kind==='yeahgrind'){
    const binding = new T.Group();
    group.add(binding);
    const width = .82, height = 1.30;
    const coverGeometry = new RoundedBoxGeometry(width+.045,height+.07,.065,1,.028);
    const cover = () => {
      const hinge = new T.Group();
      const board = new T.Mesh(coverGeometry,water);
      board.position.x=width/2;
      hinge.add(board); binding.add(hinge);
      return hinge;
    };
    const front = cover(), back = cover();
    front.position.z=.105;
    back.position.z=-.105;
    binding.add(rod(new T.Vector3(0,-height/2,0),new T.Vector3(0,height/2,0),.103));

    // The stamped Y and fore-edge make the closed cover legible at icon size.
    const ink = new T.MeshBasicMaterial({color:0x123e54});
    const gold = new T.MeshBasicMaterial({color:0xffdea0});
    ownedMaterials.push(ink,gold);
    const stamp = new T.Group();
    stamp.position.set(.45,.19,.056);
    const seal=new T.Mesh(new T.CircleGeometry(.175,36),ink);
    stamp.add(seal);
    for(const [ax,ay,bx,by] of [[-.065,.081,0,.005],[.065,.081,0,.005],[0,.005,0,-.081]]){
      const stroke=rod(new T.Vector3(ax,ay,.012),new T.Vector3(bx,by,.012),.014);
      stroke.material=gold;stamp.add(stroke);
    }
    front.add(stamp);
    const paper=document.createElement('canvas');paper.width=160;paper.height=224;
    const ctx=paper.getContext('2d')!;
    ctx.fillStyle='#e5f3ee';ctx.fillRect(0,0,160,224);
    const shade=ctx.createLinearGradient(0,0,160,0);
    shade.addColorStop(0,'#8ebabe');shade.addColorStop(.18,'#dae9e4');
    shade.addColorStop(.55,'#fafff2');shade.addColorStop(1,'#d3e3df');
    ctx.fillStyle=shade;ctx.fillRect(0,0,160,224);
    ctx.fillStyle='#669399';
    for(let line=0;line<7;line++)ctx.fillRect(25,45+line*19,(line%3===2?69:104),2);
    const map=new T.CanvasTexture(paper);
    map.colorSpace=T.SRGBColorSpace;
    const sheetMaterial=new T.MeshBasicMaterial({map,side:T.DoubleSide});
    const edgeMaterial=new T.MeshBasicMaterial({color:0xabc9c7});
    ownedTextures.push(map);ownedMaterials.push(sheetMaterial,edgeMaterial);

    const pageWidth=width-.025, pageHeight=height-.035;
    const block=new T.Mesh(new RoundedBoxGeometry(pageWidth,pageHeight,.10,1,.012),edgeMaterial);
    block.position.set(width/2,0,-.020);binding.add(block);
    const initPage=()=>{
      const geom=new T.PlaneGeometry(pageWidth,pageHeight,16,1);
      geom.translate(pageWidth/2,0,0);
      const mesh=new T.Mesh(geom,sheetMaterial);
      binding.add(mesh);
      return mesh;
    };
    const stationary=initPage();stationary.position.set(.01,0,.034);
    const leaves=Array.from({length:5},initPage);
    let previous=-1;
    animate=(_t,state)=>{
      if(state===previous)return;
      previous=state;
      // The spine is fixed inside the binding. Recenter the whole book as
      // its footprint doubles, keeping the camera trained on its center.
      group.rotation.set(-.24,-.62+.43*state,-.075);
      binding.position.x=-.39*(1-state);
      front.rotation.y=-2.97*smooth(state/.61);
      front.position.z=.105-.16*smooth(state/.61);
      back.rotation.y=-.035*state;
      leaves.forEach((leaf,index)=>{
        const phase=smooth((state-.095-index*.092)/.49);
        const angle=phase*(2.91-index*.035);
        const bend=.75*Math.sin(Math.PI*phase);
        // Integrate the tangent along the sheet so the fore-edge curls over
        // while the gutter stays anchored and the page retains its width.
        const attr=leaf.geometry.getAttribute('position') as T.BufferAttribute;
        let x=.01,z=.080-index*.008;
        for(let col=0;col<=16;col++){
          if(col>0){
            const u=(col-.5)/16;
            const tangent=angle+bend*(1-2*u);
            x+=pageWidth/16*Math.cos(tangent);
            z+=pageWidth/16*Math.sin(tangent);
          }
          for(const row of [0,1]){
            const vertex=row*17+col;
            attr.setX(vertex,x);attr.setZ(vertex,z);
          }
        }
        attr.needsUpdate=true;
        // The rest-pose sphere covers only the right side of the book.
        leaf.frustumCulled=false;
      });
    };
  }else if(kind==='studyloop'){
    for(const turn of [0,Math.PI]){
      const half=new T.Group();
      const curve=ring(.56,.098,Math.PI*.76);
      const tip=cast([[-.24,.11],[.16,.13],[.055,-.22]]);
      tip.position.set(-.43,.36,.02);tip.rotation.z=-.65;
      half.add(curve,tip);half.rotation.z=turn;group.add(half);
    }
    animate=t=>{group.rotation.z=-2*Math.PI*smooth(t);};
  }else if(kind==='clicki'){
    for(const side of [-1,1]){
      const link=ring(.40,.103);link.scale.y=1.42;
      link.rotation.set(.18,side*.49,-.83);link.position.set(side*.29,side*.19,side*.045);group.add(link);
    }
    animate=t=>{
      group.children.forEach((link,i)=>{
        const side=i===0?-1:1;
        const pull=.18*pulse(t);
        link.position.set(side*(.29+pull),side*(.19+pull*.52),side*.045);
        link.rotation.y=side*(.49+.62*pulse(t));
      });
    };
  }else if(kind==='ddc'){
    const v=(i:number)=>new T.Vector3(i&1?.45:-.45,i&2?.45:-.45,i&4?.45:-.45);
    const edge = rod(v(0),v(1),.082);
    const frame = new T.InstancedMesh(edge.geometry,water,12);
    let index = 0;
    const up = new T.Vector3(0,1,0);
    for(let i=0;i<8;i++)for(const bit of [1,2,4])if(!(i&bit)){
      const a=v(i), b=v(i|bit);
      edge.position.copy(a).lerp(b,.5);
      edge.quaternion.setFromUnitVectors(up,b.sub(a).normalize());
      edge.updateMatrix();
      frame.setMatrixAt(index++,edge.matrix);
    }
    group.add(frame);
    animate=(t,_state,turn)=>group.rotation.set(.39+.18*Math.sin(Math.PI*t),.57+turn*Math.PI/2,.07);

  }else if(kind==='shmagro'){
    const joints:T.Group[]=[];
    const grain=cast([[-.12,-.23],[-.15,.02],[0,.25],[.15,.02],[.12,-.23],[0,-.29]]);
    for(let i=0;i<4;i++){
      const joint=new T.Group();
      joint.position.y=i===0?-.77:.34;
      (i===0?group:joints[i-1]).add(joint);
      joints.push(joint);
      joint.add(rod(new T.Vector3(),new T.Vector3(0,.34,0),.046-i*.004));
      if(i>0)for(const side of [-1,1]){
        const leaf=grain.clone();
        leaf.rotation.z=-side*.67;leaf.position.set(side*.17,.11,0);joint.add(leaf);
      }
    }
    grain.position.y=.37;joints[3].add(grain);
    group.rotation.z=-.12;
    animate=t=>joints.forEach((joint,i)=>{
      // A gust reaches the base first. The upper stem bows further and
      // springs through vertical after the lower joints have settled.
      const phase=Math.max(0,t-i*.048);
      const sway=Math.sin(phase*Math.PI*3.65)*Math.exp(-phase*3.25)*(1-smooth((t-.83)/.17));
      joint.rotation.z=(.29+i*.078)*sway;
      joint.rotation.x=.13*i*sway;
    });
  }else if(kind==='blcsoftsale'){
    const head=ring(.28,.11);head.position.y=.45;
    const shaft=cast([[-.085,.20],[.085,.20],[.085,-.36],[.37,-.36],[.37,-.54],[.22,-.54],[.22,-.72],[-.085,-.72]]);
    const key=new T.Group();key.add(head,shaft);group.add(key);group.rotation.z=-.61;
    animate=(t,state)=>{
      // Seat the key, turn the bit, then withdraw with a gentle detent.
      const seat=smooth(t/.18)*(1-smooth((t-.77)/.23));
      const detent=Math.sin(Math.PI*smooth((t-.66)/.2));
      key.position.set(.035*seat,-.22*seat,-.12*seat);
      key.rotation.y=state*1.23 + detent*.095;
      key.rotation.z=-.13*seat;
    };
  }
  return {group,animate,dispose:()=>{
    ownedMaterials.forEach(material=>material.dispose());
    ownedTextures.forEach(texture=>texture.dispose());
  }};
}
