// «Гроза» — фоновое небо на чистом WebGL: ночной грозовой фронт.
// Три слоя объёмных облаков (FBM + domain warp), ветвящиеся молнии с двойным
// ударом, зарницы внутри облаков, звёзды в разрывах. Один fullscreen-треугольник,
// один draw call, без внешних 3D-библиотек.
//
// Синхронизация со страницей: та же детерминированная временная шкала ударов
// считается на CPU и пишется в CSS-переменную --flash (0..1). Слой .storm-flash,
// заголовки и логотип реагируют на вспышку одновременно с небом.
//
// Оптимизации: DPR cap 1.5, пауза при скрытой вкладке, меньше октав шума на
// мобильных, статичный «спокойный» кадр при prefers-reduced-motion (u_calm).

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
uniform float u_calm;    // 1 = статичный кадр без разрядов (reduced motion)

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

// Кучевая масса: лёгкий domain warp даёт клубящиеся кромки вместо «дыма».
float billow(vec2 p) {
  float q = fbm(p * 0.9 + vec2(0.0, u_time * 0.006));
  return fbm(p + vec2(1.7, 0.9) * q);
}

// Параметры удара: env — огибающая вспышки (двойной удар + мерцание),
// rootX — где бьёт, cyc — номер цикла (для уникальной траектории).
float strikeEnv(float period, float seed, out float rootX, out float cyc) {
  cyc = floor(u_time / period + seed);
  float ph = fract(u_time / period + seed);
  rootX = 0.14 + 0.72 * hash(vec2(cyc, seed * 7.31));
  if (ph > 0.3 || u_calm > 0.5) return 0.0;
  float flick = 0.72 + 0.28 * noise(vec2(u_time * 36.0, cyc));
  // основной пик + повторный разряд через ~85 мс — как у настоящей молнии
  float e = exp(-ph * 20.0) + 0.55 * exp(-abs(ph - 0.085) * 36.0);
  return e * flick;
}

// Свет самого канала: ломаный ствол + две ветви. dx считается в «вертикальных»
// единицах (умножен на aspect), чтобы толщина не зависела от ширины экрана.
float boltLight(vec2 uv, float aspect, float rootX, float cyc) {
  float depth = 0.56 + 0.34 * hash(vec2(cyc * 3.7, rootX));

  float wob = (noise(vec2(uv.y * 5.5, cyc * 13.7)) - 0.5) * 0.36 * (0.2 + uv.y)
            + (noise(vec2(uv.y * 21.0, cyc * 29.1)) - 0.5) * 0.07;
  float px = rootX + wob;

  float dx = abs(uv.x - px) * aspect;
  float reach = smoothstep(depth, depth - 0.14, uv.y);

  float core = exp(-dx * 150.0) * 1.7;   // белое ядро
  float glow = exp(-dx * 20.0) * 0.5;    // электрический ореол
  float halo = exp(-dx * 5.0)  * 0.16;   // широкое свечение воздуха

  // Ветвь 1 — уходит вправо-вниз, короче ствола.
  float b1x = px + (noise(vec2(uv.y * 9.0, cyc * 53.3)) - 0.5) * 0.3 + (uv.y - 0.16) * 0.17;
  float b1d = abs(uv.x - b1x) * aspect;
  float b1 = (exp(-b1d * 190.0) * 0.9 + exp(-b1d * 30.0) * 0.22)
           * smoothstep(depth * 0.62, depth * 0.62 - 0.1, uv.y)
           * step(0.12, uv.y);

  // Ветвь 2 — влево, ещё короче.
  float b2x = px + (noise(vec2(uv.y * 12.0, cyc * 71.7)) - 0.5) * 0.26 - (uv.y - 0.1) * 0.14;
  float b2d = abs(uv.x - b2x) * aspect;
  float b2 = (exp(-b2d * 210.0) * 0.7 + exp(-b2d * 34.0) * 0.16)
           * smoothstep(depth * 0.45, depth * 0.45 - 0.09, uv.y)
           * step(0.1, uv.y);

  return (core + glow + halo) * reach + b1 + b2;
}

// Зарница — рассеянная вспышка внутри облака без видимого канала.
float sheet(float period, float seed, out float sx) {
  float cyc = floor(u_time / period + seed);
  float ph = fract(u_time / period + seed);
  sx = 0.1 + 0.8 * hash(vec2(cyc, seed * 3.17));
  if (ph > 0.16 || u_calm > 0.5) return 0.0;
  return exp(-ph * 30.0) * (0.6 + 0.4 * noise(vec2(u_time * 30.0, cyc)));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  uv.y = 1.0 - uv.y; // 0 — верх экрана
  float aspect = u_res.x / u_res.y;

  // --- Небо: грозовой вечер, от зенита к тёплому натриевому горизонту ---
  vec3 zenith  = vec3(0.012, 0.020, 0.047);
  vec3 mid     = vec3(0.038, 0.060, 0.125);
  vec3 horizon = vec3(0.085, 0.115, 0.235);
  vec3 col = mix(zenith, mid, smoothstep(0.0, 0.55, uv.y));
  col = mix(col, horizon, smoothstep(0.5, 1.0, uv.y));
  // тёплая дымка города у самого горизонта
  col += vec3(0.16, 0.09, 0.05) * pow(1.0 - uv.y, 4.0) * 0.55;

  // --- Разряды: тайминги нужны и небу, и облакам ---
  float rootA; float cycA; float envA = strikeEnv(7.0, 0.37, rootA, cycA);
  float rootB; float cycB; float envB = strikeEnv(11.0, 0.81, rootB, cycB);
  float rootC; float cycC; float envC = strikeEnv(5.3, 0.61, rootC, cycC);
  float sxA; float shA = sheet(4.7, 0.53, sxA);
  float sxB; float shB = sheet(6.3, 0.17, sxB);
  float sxC; float shC = sheet(8.9, 0.29, sxC);

  // подсветка воздуха от каждого источника (радиальный спад от корня удара)
  float lampA = envA * exp(-abs(uv.x - rootA) * aspect * 1.9) * exp(-uv.y * 1.1);
  float lampB = envB * exp(-abs(uv.x - rootB) * aspect * 1.9) * exp(-uv.y * 1.1);
  float lampC = envC * exp(-abs(uv.x - rootC) * aspect * 1.9) * exp(-uv.y * 1.1);
  float lampS = (shA * exp(-abs(uv.x - sxA) * aspect * 1.3)
               + shB * exp(-abs(uv.x - sxB) * aspect * 1.3)
               + shC * exp(-abs(uv.x - sxC) * aspect * 1.3)) * smoothstep(0.8, 0.05, uv.y);
  float lamp = lampA + lampB + lampC + lampS * 0.55;

  // --- Звёзды в разрывах облаков (маска применяется ниже) ---
  vec2 scell = floor(uv * vec2(aspect, 1.0) * 110.0);
  float sh = hash(scell);
  float star = step(0.994, sh) * pow(fract(sh * 713.7), 2.0)
             * (0.55 + 0.45 * sin(u_time * (1.0 + sh * 3.0) + sh * 40.0));
  float starMask = smoothstep(0.6, 0.08, uv.y);

  // --- Облака: три слоя с параллаксом от мыши и скролла ---
  vec2 wind = vec2(u_time * 0.016, 0.0);
  vec2 par = u_mouse * vec2(0.016, 0.01);
  float drop = u_scroll * 0.45;

  // 1. Высокий тёмный потолок фронта — крупный, медленный.
  vec2 pH = vec2(uv.x * aspect, uv.y) * vec2(1.15, 2.1) + wind * 0.6 + par * 0.7 + vec2(0.0, drop * 0.6);
  float cH = billow(pH);
  float mH = smoothstep(0.38, 0.78, cH) * smoothstep(0.85, 0.25, uv.y);

  // 2. Главная кучевая масса.
  vec2 pM = vec2(uv.x * aspect, uv.y) * vec2(1.9, 3.4) + wind + par + vec2(4.2, drop);
  float cM = billow(pM);
  float mM = smoothstep(0.42, 0.8, cM) * smoothstep(0.95, 0.2, uv.y);

  // 3. Низкие быстрые клочья.
  vec2 pL = vec2(uv.x * aspect, uv.y) * vec2(3.4, 5.6) + wind * 2.3 + par * 1.6 + vec2(9.1, drop * 1.4);
  float cL = fbm(pL);
  float mL = smoothstep(0.52, 0.88, cL) * smoothstep(1.0, 0.35, uv.y);

  // Объём: сравниваем плотность с чуть смещённой выборкой — верхние кромки
  // ловят холодный свет, низ уходит в тень.
  float liftM = cM - billow(pM + vec2(0.0, 0.16));
  float liftH = cH - billow(pH + vec2(0.0, 0.14));

  vec3 cloudDeep = vec3(0.030, 0.043, 0.086); // грозовое брюхо
  vec3 cloudBody = vec3(0.075, 0.098, 0.168);
  vec3 cloudRim  = vec3(0.40, 0.47, 0.68);    // лунно-серебристая кромка

  vec3 cH_col = mix(cloudDeep, cloudBody, smoothstep(-0.1, 0.28, liftH));
  vec3 cM_col = mix(cloudDeep, cloudBody, smoothstep(-0.12, 0.26, liftM));
  cM_col = mix(cM_col, cloudRim, smoothstep(0.14, 0.4, liftM) * 0.55);

  // Вспышка освещает облака изнутри — молочно-электрический свет.
  vec3 flashTint = vec3(0.72, 0.84, 1.15);
  cH_col += flashTint * lamp * (0.55 + 0.45 * smoothstep(-0.1, 0.3, liftH));
  cM_col += flashTint * lamp * (0.7 + 0.5 * smoothstep(-0.1, 0.3, liftM));
  vec3 cL_col = cloudBody * 0.85 + flashTint * lamp * 0.5;

  // звёзды видны только там, где нет облаков
  float cover = clamp(mH + mM + mL, 0.0, 1.0);
  col += vec3(0.72, 0.82, 1.0) * star * starMask * (1.0 - cover) * 0.6;

  col = mix(col, cH_col, mH * 0.9);
  col = mix(col, cM_col, mM * 0.94);
  col = mix(col, cL_col, mL * 0.5);

  // общий отсвет воздуха между облаками
  col += flashTint * lamp * 0.10;

  // --- Каналы молний: рисуются поверх облаков (разряд ближе к зрителю) ---
  float light = 0.0;
  if (envA > 0.001) light += boltLight(uv, aspect, rootA, cycA) * envA;
  if (envB > 0.001) light += boltLight(uv, aspect, rootB, cycB) * envB;
  if (envC > 0.001) light += boltLight(uv, aspect, rootC, cycC) * envC;

  vec3 boltCol = mix(vec3(0.62, 0.92, 1.15), vec3(0.72, 0.60, 1.15), uv.y); // volt -> arc
  col += boltCol * light;
  col += vec3(1.0) * light * light * 0.22; // пересвет ядра до белого

  // мягкое виньетирование к низу, чтобы контент читался
  col *= 1.0 - smoothstep(0.55, 1.0, uv.y) * 0.22;

  // дизеринг против полос градиента
  col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}
`;

// Та же временная шкала на CPU — для CSS-переменной --flash.
function flashAt(timeSec: number): number {
  const gen = (period: number, seed: number, win: number, k: number, second: boolean) => {
    const ph = (timeSec / period + seed) % 1;
    if (ph > win) return 0;
    let e = Math.exp(-ph * k);
    if (second) e += 0.55 * Math.exp(-Math.abs(ph - 0.085) * 36.0);
    return e;
  };
  const strikes = gen(7.0, 0.37, 0.3, 20, true) + gen(11.0, 0.81, 0.3, 20, true) + gen(5.3, 0.61, 0.3, 20, true);
  const sheets = gen(4.7, 0.53, 0.16, 30, false) + gen(6.3, 0.17, 0.16, 30, false) + gen(8.9, 0.29, 0.16, 30, false);
  return Math.min(1, strikes * 0.62 + sheets * 0.3);
}

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
    const uCalm = gl.getUniformLocation(program, 'u_calm');

    const root = document.documentElement;
    const mouse = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    let scroll = 0;
    let targetScroll = 0;
    let rafId = 0;
    let running = true;
    let lastFlash = -1;
    const start = performance.now();

    // Адаптивное качество: если кадры не успевают, снижаем разрешение
    // рендера (CSS растянет канвас — гроза остаётся, нагрузка падает).
    const QUALITY_STEPS = [1.5, 1.2, 1.0, 0.8];
    let quality = 0;
    let frameEma = 16;
    let frameCount = 0;
    let lastTickAt = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, QUALITY_STEPS[quality]);
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

    const draw = (timeSec: number, calm: number) => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, timeSec);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uScroll, scroll);
      gl.uniform1f(uCalm, calm);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const tick = () => {
      if (!running) return;
      const now = performance.now();
      const dt = lastTickAt ? now - lastTickAt : 16;
      lastTickAt = now;
      if (dt < 100) {
        // фильтруем скачки после разворота вкладки
        frameEma = frameEma * 0.9 + dt * 0.1;
        frameCount++;
        if (frameCount >= 90) {
          frameCount = 0;
          if (frameEma > 21 && quality < QUALITY_STEPS.length - 1) {
            quality++;
            resize();
          } else if (frameEma < 13.5 && quality > 0) {
            quality--;
            resize();
          }
        }
      }
      mouse.x += (target.x - mouse.x) * 0.05;
      mouse.y += (target.y - mouse.y) * 0.05;
      scroll += (targetScroll - scroll) * 0.07;
      const t = (now - start) / 1000;
      draw(t, 0);

      // Вспышка для интерфейса: пишем только заметные изменения.
      const f = flashAt(t);
      if (Math.abs(f - lastFlash) > 0.02 || (f === 0 && lastFlash !== 0)) {
        lastFlash = f;
        root.style.setProperty('--flash', f.toFixed(3));
      }

      rafId = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      running = !document.hidden;
      lastTickAt = 0;
      if (running && !reduced) rafId = requestAnimationFrame(tick);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    resize();
    onScroll();

    if (reduced) {
      draw(12.0, 1); // один спокойный кадр: облака и звёзды, без разрядов
      root.style.setProperty('--flash', '0');
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
      root.style.setProperty('--flash', '0');
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return <canvas ref={canvasRef} className="void-canvas" aria-hidden="true" />;
}
