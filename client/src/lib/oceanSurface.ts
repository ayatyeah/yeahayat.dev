import { scenePaused, watchSceneVisibility } from './sceneVisibility';

// The image stays in world coordinates. Only the water bends the light passing
// through it, so an idle wave and a scrolling camera share the same horizon.
const vertex = `
attribute vec2 point;
varying vec2 screen;
void main() {
  screen = vec2(point.x * .5 + .5, .5 - point.y * .5);
  gl_Position = vec4(point, 0., 1.);
}`;

const fragment = `
precision highp float;
uniform sampler2D panorama;
uniform vec4 crop;
uniform float time;
varying vec2 screen;
void main() {
  float t = time * .78;
  // A small continuous camera drift is independent of scroll. Overscan keeps
  // the panorama edge outside the frame, even when the camera reaches the sand.
  vec2 drift = vec2(.0045*sin(t*.27), .005*cos(t*.23));
  vec2 uv = ((screen-.5)*.984 + .5 + drift) * crop.zw + crop.xy;
  float waterline = .244 + .004 * sin(uv.x * 10. - .5);
  float depth = uv.y - waterline;
  float crest = 1. - smoothstep(.005, .072, abs(depth));
  float submerged = smoothstep(-.003, .033, depth);
  float swell = sin(uv.x * 17. - t * 1.10) + .47 * sin(uv.x * 33. - t * 1.63 + .7);
  float ripple = sin(uv.x * 77. + uv.y * 92. - t * 1.9);
  vec2 ray = uv;
  // Translate the cloud banks in a different phase from the moving water.
  // The solar disc retains its shape and the shoreline remains continuous.
  float sky = 1. - smoothstep(-.085,-.012,depth);
  float wind = sky * smoothstep(.018,.14,length((uv-vec2(.855,.064))*vec2(1.,1.76)));
  float edge = smoothstep(0.,.045,min(uv.x,1.-uv.x));
  ray.x += wind * edge * (.021*sin(t*.21+uv.y*4.) + .004*sin(t*.38+uv.x*5.));
  ray.y += wind * .0023*sin(t*.25+uv.x*9.)*smoothstep(0.,.03,uv.y);
  ray.y += crest * (.0055 * swell + .00075 * ripple);
  ray.x += crest * (.0058 * cos(uv.x * 17. - t * 1.10) + .0018 * sin(uv.y * 152. + t));
  ray.x += submerged * exp(-3. * max(depth,0.)) * .0023 * sin(uv.y * 43. + t * .65);
  vec3 colour = texture2D(panorama, clamp(ray, .0001, .9999)).rgb;
  float beam = (uv.x - .91) / (.36 + max(depth,0.));
  float light = sin(beam*15. + .73*sin(t*.55)) + .55*sin(beam*32. - t*.41);
  float beamMask = submerged * exp(-2.8 * max(depth,0.)) * (.22 + .78*smoothstep(.26,.92,screen.x));
  colour *= 1. + .094 * light * beamMask;
  colour += vec3(.008,.034,.046) * max(light,0.) * beamMask;
  colour += crest * max(ripple,0.) * smoothstep(.39,.85,colour.g) * vec3(.022,.050,.054);
  // The seabed's own highlights provide a mask for the travelling caustics.
  float floorMask = smoothstep(.82,.96,uv.y) * smoothstep(.14,.47,colour.g);
  float caustic = sin(uv.x*53. + uv.y*99. - t*1.5 + 2.*sin(uv.y*36.+t*.6));
  colour += floorMask * caustic * vec3(.048,.10,.125);
  float luminance = dot(colour, vec3(.2126,.7152,.0722));
  colour = mix(vec3(luminance),colour,.85);
  colour += vec3(.056,.035,.018)*(1.-luminance)*(.5+.5*submerged);
  gl_FragColor = vec4(colour,1.);
}`;

export function mountOceanSurface(canvas: HTMLCanvasElement, photo: HTMLImageElement) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return;
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  const shaders: WebGLShader[] = [];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, previous = 0, elapsed = 0;
  let offsetX = 0, offsetY = 0, spanX = 1, spanY = 1, offsetToUV = 0, scrollOffset = 0;
  let width = 0, height = 0, uploaded = false;
  let unwatch: (() => void) | undefined;
  function destroy() {
    cancelAnimationFrame(frame);
    canvas.removeEventListener('webglcontextlost', lost);
    unwatch?.();
    motion.removeEventListener('change', sync);
    photo.removeEventListener('load', upload);
    delete canvas.dataset.active;
    gl!.deleteTexture(texture);
    gl!.deleteBuffer(buffer);
    gl!.deleteProgram(program);
    shaders.forEach(shader => gl!.deleteShader(shader));
    gl!.getExtension('WEBGL_lose_context')?.loseContext();
  }
  function lost() {
    cancelAnimationFrame(frame);
    delete canvas.dataset.active;
    uploaded = false;
  }
  try {
    if (!program || !buffer || !texture) throw new Error('Ocean resources unavailable');
    for (const [type, source] of [[gl.VERTEX_SHADER,vertex], [gl.FRAGMENT_SHADER,fragment]] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Ocean shader unavailable');
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Ocean shader failed');
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('Ocean program failed');
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const point = gl.getAttribLocation(program,'point');
    gl.enableVertexAttribArray(point);
    gl.vertexAttribPointer(point,2,gl.FLOAT,false,0,0);
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  } catch { destroy(); return; }

  const crop = gl.getUniformLocation(program!, 'crop');
  const clock = gl.getUniformLocation(program!, 'time');
  function draw() {
    if (!uploaded || !width || !height || motion.matches || scenePaused()) return;
    gl!.uniform4f(crop,offsetX,offsetY+scrollOffset*offsetToUV,spanX,spanY);
    gl!.uniform1f(clock,elapsed);
    gl!.drawArrays(gl!.TRIANGLES,0,3);
    canvas.dataset.active = 'true';
  }
  function tick(now: number) {
    if (now - previous >= 40) {
      elapsed += previous ? Math.min(now-previous,110)/1000 : 0;
      previous = now;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    previous = 0;
    if (scenePaused()) return;
    if (motion.matches || !uploaded) {
      delete canvas.dataset.active;
      return;
    }
    draw();
    frame = requestAnimationFrame(tick);
  }
  function upload() {
    if (!photo.naturalWidth || gl!.isContextLost()) return;
    gl!.texImage2D(gl!.TEXTURE_2D,0,gl!.RGB,gl!.RGB,gl!.UNSIGNED_BYTE,photo);
    uploaded = true;
    sync();
  }
  motion.addEventListener('change',sync);
  unwatch=watchSceneVisibility(sync);
  canvas.addEventListener('webglcontextlost',lost);
  photo.addEventListener('load',upload);
  if (photo.complete) upload();
  return {
    resize(w: number, h: number, plateHeight: number, photoAspect: number) {
      width = w;
      height = h;
      const scale = Math.min(window.devicePixelRatio, 1.35, 1600 / w, 1150 / h);
      canvas.width = Math.max(1,Math.round(w*scale));
      canvas.height = Math.max(1,Math.round(h*scale));
      gl!.viewport(0,0,canvas.width,canvas.height);
      const imageWidth = Math.max(w, plateHeight * photoAspect);
      const imageHeight = imageWidth / photoAspect;
      spanX = w/imageWidth;
      spanY = h/imageHeight;
      offsetX = (1-spanX) * (w <= 700 ? .56 : .5);
      offsetY = (1-plateHeight/imageHeight)*.5;
      offsetToUV = 1/imageHeight;
      draw();
    },
    scroll(pixels: number) { scrollOffset = pixels; draw(); },
    destroy,
  };
}
