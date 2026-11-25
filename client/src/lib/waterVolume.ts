import * as T from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';

const extent = 1.14;

function outlineDistance(points: T.Vector3[], size: number) {
  const field = new Float32Array(size * size);
  const edgeCount = points.length - 1;
  const segments = points.slice(0, edgeCount).map((a, index) => {
    const b = points[index + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    return { x: a.x, y: a.y, dx, dy, endY: b.y, inverseLengthSq: 1 / (dx * dx + dy * dy) };
  });
  for (let y = 0; y < size; y++) {
    const py = (2 * y / size - 1) * extent;
    for (let x = 0; x < size; x++) {
      const px = (2 * x / size - 1) * extent;
      let inside = false, nearest = Infinity;
      for (let i = 0; i < edgeCount; i++) {
        const edge = segments[i];
        const vx = px - edge.x, vy = py - edge.y;
        const t = Math.max(0, Math.min(1, (vx * edge.dx + vy * edge.dy) * edge.inverseLengthSq));
        const ex = vx - t * edge.dx, ey = vy - t * edge.dy;
        nearest = Math.min(nearest, ex * ex + ey * ey);
        if ((edge.y > py) !== (edge.endY > py) && vx < vy * edge.dx / edge.dy) inside = !inside;
      }
      field[x + size * y] = Math.sqrt(nearest) * (inside ? 1 : -1);
    }
  }
  return field;
}

export function waterVolume(outline: T.Vector3[], material: T.Material, size = 40, withCounter = false) {
  const profile = new T.CatmullRomCurve3(outline, true);
  const distance = outlineDistance(profile.getPoints(Math.min(132, outline.length * 5)), size);
  if (withCounter) {
    const counter = [[.018,.55],[.067,.50],[.117,.32],[.16,.15],[.148,.084],
      [.065,.063],[-.095,.052],[-.142,.09],[-.12,.21],[-.054,.43]];
    const hole = new T.CatmullRomCurve3(counter.map(([x,y]) => new T.Vector3(x,y,0)), true);
    const opening = outlineDistance(hole.getPoints(44), size);
    for (let i = 0; i < distance.length; i++) distance[i] = Math.min(distance[i], -opening[i]);
  }

  const surface = new MarchingCubes(size, material, false, false, 8 * size * size);
  surface.isolation = 0;
  surface.field.fill(-1);
  for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
    const offset = x + size * y;
    const d = distance[offset];
    const px = (2 * x / size - 1) * extent, py = (2 * y / size - 1) * extent;
    // Soften the medial ridge of each stroke while retaining the drawn edge.
    const neighbors = distance[offset-1] + distance[offset+1] + distance[offset-size] + distance[offset+size];
    const rounded = d + .24 * T.MathUtils.smoothstep(d, .012, .12) * (neighbors - 4 * d);
    const thickness = .42 + .085 * Math.sin(3.1 * px + 2.4 * py) + .038 * Math.cos(5.9 * py - px);
    const drift = .040 * Math.sin(3.7 * py + 2 * px) + .022 * Math.cos(4.6 * px - py);
    for (let z = 1; z < size - 1; z++) {
      const pz = (2 * z / size - 1) * extent - drift;
      surface.field[offset + size * size * z] = rounded - pz * pz / thickness;
    }
  }
  surface.update();
  // Every vertex returned by marching cubes belongs to a grid edge. Its axis
  // and the lower grid endpoint give us a cheap, deterministic vertex index.
  const rawPosition = surface.geometry.getAttribute('position').array;
  const rawNormal = surface.geometry.getAttribute('normal').array;
  const edgeVertices = new Uint16Array(3 * size ** 3);
  const indices = new Uint16Array(surface.count);
  const positions: number[] = [], normals: number[] = [];
  for (let i = 0; i < surface.count; i++) {
    const offset = 3 * i;
    const x = (rawPosition[offset] + 1) * size / 2;
    const y = (rawPosition[offset+1] + 1) * size / 2;
    const z = (rawPosition[offset+2] + 1) * size / 2;
    const ix = Math.round(x), iy = Math.round(y), iz = Math.round(z);
    const dx = Math.abs(x-ix), dy = Math.abs(y-iy), dz = Math.abs(z-iz);
    const axis = dx >= dy && dx >= dz ? 0 : dy >= dz ? 1 : 2;
    const edge = axis + 3 * ((axis === 0 ? Math.floor(x) : ix) +
      size * ((axis === 1 ? Math.floor(y) : iy) + size * (axis === 2 ? Math.floor(z) : iz)));
    if (!edgeVertices[edge]) {
      positions.push(rawPosition[offset],rawPosition[offset+1],rawPosition[offset+2]);
      normals.push(rawNormal[offset],rawNormal[offset+1],rawNormal[offset+2]);
      edgeVertices[edge] = positions.length / 3;
    }
    indices[i] = edgeVertices[edge] - 1;
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geometry.setIndex(new T.BufferAttribute(indices,1));
  geometry.scale(extent,extent,extent);
  geometry.normalizeNormals();
  surface.geometry.dispose();
  return geometry;
}
