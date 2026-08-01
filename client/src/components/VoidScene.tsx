// Фоновое небо на чистом WebGL: процедурные облака (FBM) + разряды молний.
// Один fullscreen-треугольник, один draw call — вместо тяжёлой 3D-библиотеки.
// Внешняя 3D-библиотека удалена из зависимостей (−120 КБ gzip в бандле).
// Оптимизации: DPR cap, пауза при скрытой вкладке, статичный кадр при
// prefers-reduced-motion, меньше октав шума на мобильных.

import { useEffect, useRef } from 'react';

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;

uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_mouse;   // -1..1, сглаженная
uniform float u_scroll;  // 0..1

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < OCTAVES; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(11.7, 7.3);
    a *= 0.5;
  }
  return v;
}

// Один разряд молнии: period — период цикла в секундах, seed — уникальность.
// Возвращает вклад света (0..~1.5) для пикселя uv.
float bolt(vec2 uv, float period, float seed) {
  float cycle = floor(u_time / period + seed);
  float phase = fract(u_time / period + seed);

  // Вспышка живёт первые ~22% цикла: резкий пик, быстрый спад, мерцание.
  if (phase > 0.24) return 0.0;
  float env = exp(-phase * 16.0) * (0.72 + 0.28 * noise(vec2(u_time * 34.0, cycle)));

  // Корень удара и глубина (до какой высоты бьёт).
  float rootX = 0.18 + 0.64 * hash(vec2(cycle, seed * 7.31));
  float depth = 0.5 + 0.38 * hash(vec2(cycle * 3.7, seed));

  // Ломаная траектория: смещение по шуму, растёт с глубиной.
  float wob = (noise(vec2(uv.y * 6.5, cycle * 13.7)) - 0.5) * 0.34 * (0.25 + uv.y)
            + (noise(vec2(uv.y * 23.0, cycle * 31.1)) - 0.5) * 0.06;
  float px = rootX + wob;

  float d = abs(uv.x - px);
  float reach = smoothstep(depth, depth - 0.12, uv.y);

  float core = exp(-d * 220.0) * 1.2;
  float glow = exp(-d * 26.0) * 0.42;

  // Ветка: короче, тоньше, со своим изломом.
  float bx = px + (noise(vec2(uv.y * 11.0, cycle * 53.3)) - 0.5) * 0.22 + (uv.y - 0.2) * 0.12;
  float bd = abs(uv.x - bx);
  float branch = (exp(-bd * 260.0) * 0.7 + exp(-bd * 40.0) * 0.2)
               * smoothstep(depth * 0.6, depth * 0.6 - 0.1, uv.y);

  return (core + glow + branch) * reach * env;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  uv.y = 1.0 - uv.y; // 0 — верх экрана
  float aspect = u_res.x / u_res.y;

  // --- Небо: светлый градиент в палитре сайта ---
  vec3 top = vec3(0.835, 0.865, 0.955);
  vec3 bottom = vec3(0.965, 0.975, 0.995);
  vec3 col = mix(top, bottom, smoothstep(0.0, 1.0, uv.y));

  // лёгкая подкраска у горизонта
  col += vec3(0.045, 0.03, 0.0) * (1.0 - uv.y) * 0.35;

  // --- Облака: два слоя с параллаксом от мыши и скролла ---
  vec2 wind = vec2(u_time * 0.014, 0.0);
  vec2 par = u_mouse * vec2(0.012, 0.008);

  vec2 p1 = vec2(uv.x * aspect, uv.y) * vec2(1.6, 2.9) + wind + par + vec2(0.0, u_scroll * 0.4);
  float c1 = fbm(p1);
  float m1 = smoothstep(0.44, 0.78, c1);

  vec2 p2 = vec2(uv.x * aspect, uv.y) * vec2(3.1, 5.4) + wind * 2.1 + par * 1.7 + vec2(3.7, u_scroll * 0.7);
  float c2 = fbm(p2);
  float m2 = smoothstep(0.5, 0.85, c2);

  // объём: нижняя кромка облаков чуть темнее
  float shade1 = fbm(p1 + vec2(0.0, 0.14));
  vec3 cloudLit = vec3(1.0);
  vec3 cloudShadow = vec3(0.78, 0.81, 0.9);
  vec3 cloud1 = mix(cloudShadow, cloudLit, smoothstep(-0.12, 0.3, c1 - shade1) * 0.8 + 0.2);

  col = mix(col, cloud1, m1 * 0.82);
  col = mix(col, cloudLit, m2 * 0.38);

  // --- Молнии: два независимых разряда ---
  float l1 = bolt(vec2(uv.x, uv.y), 9.0, 0.37);
  float l2 = bolt(vec2(uv.x, uv.y), 13.0, 0.81);
  float l = l1 + l2;

  vec3 boltCol = mix(vec3(0.28, 0.38, 0.92), vec3(0.5, 0.36, 0.98), uv.y); // индиго -> фиолет
  col += boltCol * l;

  // общий отсвет неба во время удара
  float flashEnv = 0.0;
  {
    float ph1 = fract(u_time / 9.0 + 0.37);
    float ph2 = fract(u_time / 13.0 + 0.81);
    if (ph1 < 0.24) flashEnv += exp(-ph1 * 16.0);
    if (ph2 < 0.24) flashEnv += exp(-ph2 * 16.0);
  }
  col += vec3(0.32, 0.34, 0.6) * flashEnv * 0.05 * (1.0 - uv.y * 0.6);

  // дизеринг против полос градиента
  col += (hash(gl_FragCoord.xy) - 0.5) * 0.008;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

export default function VoidScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance'
    });
    if (!gl) return; // нет WebGL — останется CSS-градиент body

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const octaves = window.innerWidth < 760 ? 4 : 5;

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG.replace(/OCTAVES/g, String(octaves))));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    // Fullscreen-треугольник
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'u_res');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uMouse = gl.getUniformLocation(program, 'u_mouse');
    const uScroll = gl.getUniformLocation(program, 'u_scroll');

    const mouse = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    let scroll = 0;
    let targetScroll = 0;
    let rafId = 0;
    let running = true;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const onPointerMove = (event: PointerEvent) => {
      target.x = (event.clientX / window.innerWidth - 0.5) * 2;
      target.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      targetScroll = window.scrollY / max;
    };

    const draw = (timeSec: number) => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, timeSec);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uScroll, scroll);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const tick = () => {
      if (!running) return;
      mouse.x += (target.x - mouse.x) * 0.05;
      mouse.y += (target.y - mouse.y) * 0.05;
      scroll += (targetScroll - scroll) * 0.07;
      draw((performance.now() - start) / 1000);
      rafId = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      running = !document.hidden;
      if (running && !reduced) rafId = requestAnimationFrame(tick);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    resize();
    onScroll();

    if (reduced) {
      draw(3.0); // один спокойный кадр с облаками, без молний
    } else {
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return <canvas ref={canvasRef} className="void-canvas" aria-hidden="true" />;
}
