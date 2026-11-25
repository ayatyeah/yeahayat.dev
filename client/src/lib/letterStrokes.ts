import { BufferAttribute, DynamicDrawUsage, type BufferGeometry, type Vector3 } from 'three';

// Centre lines in the drawing plane of the sculpted glyphs. Distance travels
// around joints and the counter of A instead of jumping across empty water.
const paths = [
  { nodes: [[28,96],[85,170],[148,85],[82,220],[80,265]], edges: [[0,1],[2,1],[1,3],[3,4]] },
  { nodes: [[282,100],[201,106],[190,179],[263,174],[185,258],[269,256]], edges: [[0,1],[1,2],[2,3],[2,4],[4,5]] },
  { nodes: [[320,263],[345,208],[380,98],[415,207],[445,263]], edges: [[0,1],[1,2],[2,3],[3,4],[1,3]] },
  { nodes: [[493,99],[508,185],[499,262],[552,181],[601,178],[607,103],[609,262]], edges: [[0,1],[1,2],[1,3],[3,4],[4,5],[4,6]] }
];

export function prepareStroke(geometry: BufferGeometry, letter: number, centerX: number) {
  const {nodes, edges} = paths[letter];
  const lengths = edges.map(([a,b]) => Math.hypot(nodes[b][0]-nodes[a][0],nodes[b][1]-nodes[a][1]));
  const distance = nodes.map((_, a) => nodes.map((_, b) => a === b ? 0 : Infinity));
  edges.forEach(([a,b],i) => { distance[a][b] = distance[b][a] = lengths[i]; });
  for (let k=0;k<nodes.length;k++) for (let a=0;a<nodes.length;a++) for (let b=0;b<nodes.length;b++)
    distance[a][b] = Math.min(distance[a][b], distance[a][k] + distance[k][b]);

  function project(x:number,y:number) {
    let edge=0, along=0, nearest=Infinity;
    edges.forEach(([a,b],i) => {
      const dx=nodes[b][0]-nodes[a][0], dy=nodes[b][1]-nodes[a][1];
      const t=Math.max(0,Math.min(1,((x-nodes[a][0])*dx+(y-nodes[a][1])*dy)/lengths[i]**2));
      const away=Math.hypot(x-nodes[a][0]-t*dx,y-nodes[a][1]-t*dy);
      if (away<nearest) { nearest=away; along=t*lengths[i]; edge=i; }
    });
    return {edge,along};
  }
  const pos=geometry.getAttribute('position');
  const samples=Array.from({length:pos.count},(_,i)=>project(centerX+pos.getX(i)*110,181-pos.getY(i)*110));
  const attribute=new BufferAttribute(new Float32Array(pos.count),1).setUsage(DynamicDrawUsage);
  geometry.setAttribute('strokeDistance',attribute);
  return (hit:Vector3) => {
    const start=project(centerX+hit.x*110,181-hit.y*110);
    const [from,to]=edges[start.edge];
    const reach=nodes.map((_,i)=>Math.min(start.along+distance[from][i],lengths[start.edge]-start.along+distance[to][i]));
    samples.forEach(({edge,along},i)=>{
      const [a,b]=edges[edge];
      const throughNode=Math.min(reach[a]+along,reach[b]+lengths[edge]-along);
      attribute.setX(i,(edge===start.edge ? Math.min(throughNode,Math.abs(along-start.along)) : throughNode)/110);
    });
    attribute.needsUpdate=true;
  };
}
