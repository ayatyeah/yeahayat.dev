import * as T from 'three';

const sun = 'normalize(vec3(.47,.22,-1.))';
const skyFragment = `
varying vec3 direction;
uniform float night;
uniform float immersion;
uniform float time;
uniform sampler2D panorama;
void main(){
 vec3 d=normalize(direction);
 float longitude=atan(d.x,-d.z);
 float latitude=asin(clamp(d.y,-1.,1.));
 // Project the photographic sky onto the forward hemisphere. Fold it behind
 // the camera so reflected rays stay continuous across the cubemap seam.
 float u=.5+.48*sin(longitude*1.75);
 float v=clamp(.51+.50*sin(latitude*3.0),.015,.985);
 vec3 photo=texture2D(panorama,vec2(u+.015*sin(time*.076)*(1.-smoothstep(-.26,.18,d.y)),v)).rgb;
 vec3 col=photo;
 float below=1.-smoothstep(-.68,-.21,d.y);
 col=mix(col,vec3(.012,.052,.105)+photo*.22,below*.91);
 vec3 solar=${sun};
 float sun=max(dot(d,solar),0.);
 col+=vec3(1.,.76,.43)*(.48*pow(sun,95.)+.9*pow(sun,1600.)+5.*pow(sun,13000.));
 vec2 delta=d.xy/max(.1,-d.z)-solar.xy/(-solar.z);
 float rays=pow(.5+.5*cos(8.*atan(delta.y,delta.x)+.5),22.);
 col+=vec3(1.,.67,.35)*rays*exp(-length(delta)*33.)*.48;
 col=mix(col,vec3(.04,.38,.55),immersion);
 gl_FragColor=vec4(col*mix(vec3(1.),vec3(.105,.17,.33),night),1.);
 #include <colorspace_fragment>
}`;

const vertex = `
uniform float time;
uniform vec2 pointer;
uniform float attention;
#ifdef LETTER_WAVES
uniform vec4 ripples[3];
attribute float strokeDistance;
uniform float strokeTime;
varying float crestLight;
#else
uniform vec2 impact;
#endif
uniform float age;
varying vec3 worldPos;
varying vec3 worldNormal;
// Evaluate displacement and its gradient together. The same crest that changes
// the silhouette turns the surface normal towards the sun.
vec4 surfaceWave(vec3 p){
 vec3 phase=vec3(dot(p,vec3(3.,6.,0.))+time*1.45,
                 p.x*12.-p.z*7.-time*1.75,
                 p.y*27.+p.x*16.-time*2.6);
 vec3 amplitude=vec3(.020,.013,.004);
 float height=dot(amplitude,sin(phase));
 vec3 slope=amplitude*cos(phase);
 vec3 gradient=vec3(3.*slope.x+12.*slope.y+16.*slope.z,
                    6.*slope.x+27.*slope.z,-7.*slope.y);
 #ifndef LETTER_WAVES
 if(age>=0. && age<1.1){
   vec2 delta=p.xy-impact;
   float radius=length(delta);
   float front=radius-age*2.8;
   float envelope=.105*exp(-30.*front*front-3.*age);
   float wave=cos(15.*front);
   height+=envelope*wave;
   gradient.xy+=delta/max(radius,.001)*envelope*(-60.*front*wave-15.*sin(15.*front));
 }
 #endif
 if(attention>.001){
   vec2 delta=p.xy-pointer;
   float radius=length(delta);
   float phase=17.*radius-6.*time;
   float envelope=.024*attention*exp(-2.*radius);
   height+=envelope*cos(phase);
   gradient.xy+=delta/max(radius,.001)*envelope*(-2.*cos(phase)-17.*sin(phase));
 }
 return vec4(gradient,height);
}
void main(){
 mat4 objectToWorld=modelMatrix;
 #ifdef USE_INSTANCING
 objectToWorld=objectToWorld*instanceMatrix;
 #endif
 vec3 p=(objectToWorld*vec4(position,1.)).xyz;
 vec3 n=normalize(mat3(objectToWorld)*normal);
 vec4 wave=surfaceWave(p);
 #ifdef LETTER_WAVES
 float strokeAge = time - strokeTime;
 crestLight = 0.;
 if (strokeAge >= 0. && strokeAge < 1.65) {
   float front = strokeDistance - strokeAge * 2.25;
   float envelope = exp(-32.*front*front) * (1.-smoothstep(.78,1.65,strokeAge));
   crestLight = envelope;
   wave.w += length(objectToWorld[0].xyz)*envelope*(.095+.035*sin(front*14.));
 }
 // Each centre is stored on this glyph. Its position, amplitude and normal
 // gradient follow the same local-to-world transform as the surface.
 for(int i=0;i<3;i++){
   float elapsed=time-ripples[i].w;
   if(elapsed>=0. && elapsed<1.15){
     vec3 delta=position-ripples[i].xyz;
     float radius=length(delta), front=radius-elapsed*2.35;
     float envelope=.084*exp(-28.*front*front-2.8*elapsed);
     float crest=cos(17.*front);
     float scale=length(objectToWorld[0].xyz);
     wave.w+=scale*envelope*crest;
     vec3 grad=delta/max(.001,radius)*envelope*(-56.*front*crest-17.*sin(17.*front));
     wave.xyz+=mat3(objectToWorld)*grad/max(scale,.001);
   }
 }
 #endif
 worldNormal=normalize(n-wave.xyz+n*dot(n,wave.xyz));
 worldPos=p+n*wave.w;
 gl_Position=projectionMatrix*viewMatrix*vec4(worldPos,1.);
}`;
// The backdrop and all refracted rays use the same animated lighting field.
const environmentLight = `
uniform samplerCube sky;
uniform float immersion;
uniform float night;
uniform float time;
vec3 environment(vec3 ray){
  // Drift low cloud banks; leave the solar disc anchored above the horizon.
  float drift=.075*sin(time*.076) * (1.-smoothstep(-.26,.18,ray.y));
  vec3 daylight=textureCube(sky,vec3(ray.x+drift*ray.z,ray.y,ray.z-drift*ray.x)).rgb;
  daylight=mix(daylight,daylight*vec3(.105,.17,.33),night);
  if(immersion<=0.) return daylight;
  vec2 slope=ray.xy/max(.40,abs(ray.z));
  float depth=clamp(.46+.60*ray.y,0.,1.);
  float shaft=pow(.5+.5*sin(12.*slope.x+4.*slope.y+.19*time+sin(slope.x*7.-.16*time)),5.);
  vec3 blue=mix(vec3(.012,.095,.16),vec3(.13,.63,.72),depth);
  blue+=vec3(.12,.24,.20)*shaft*(.22+.67*depth);
  return mix(daylight,blue*mix(1.,.37,night),immersion);
}
`;
const fragment = `
${environmentLight}
varying vec3 worldPos;
varying vec3 worldNormal;

#ifdef LETTER_WAVES
varying float crestLight;
uniform sampler2D scenePhoto;
uniform vec4 photoCrop;
uniform vec2 inverseBuffer;
uniform float hasScenePhoto;
#endif

const float waterIOR=1.333;
const vec3 lensAxes=vec3(1.,1.,1.2);

void main() {
  vec3 viewRay=normalize(worldPos-cameraPosition);
  vec3 surface=normalize(worldNormal);
  vec3 normal=faceforward(surface,viewRay,surface);
  float facing=clamp(dot(-viewRay,normal),0.,1.);

  // Trace the front and back boundaries of a convex water lobe. This yields
  // two different cloud images: a mirrored rim and a bent, transmitted core.
  vec3 inside=refract(viewRay,normal,1./waterIOR);
  vec3 entry=normalize(normal*lensAxes);
  vec3 chord=normalize(inside/lensAxes);
  float distanceAcross=-2.*dot(entry,chord);
  vec3 farNormal=-normalize((entry+distanceAcross*chord)/lensAxes);
  float exitCos=dot(-inside,farNormal);
  float discriminant=1.-waterIOR*waterIOR*(1.-exitCos*exitCos);
  vec3 through=waterIOR*inside+(waterIOR*exitCos-sqrt(max(0.,discriminant)))*farNormal;
  vec3 exitRay=discriminant<0. ? reflect(inside,farNormal) : through;

  float rim=1.-facing;
  float rim2=rim*rim;
  float fresnel=.0204+.9796*rim2*rim2*rim;
  vec3 reflected=environment(reflect(viewRay,normal));
  vec3 transmitted=environment(exitRay);
  #ifdef LETTER_WAVES
  // Look through the front face into the same part of the sky or ocean that
  // surrounds the glyph. Grazing rays still see the environment reflection.
  vec2 screenUV=gl_FragCoord.xy*inverseBuffer;
  vec2 bend=normal.xy*(.025+.028*clamp(distanceAcross,0.,1.));
  vec2 lookup=photoCrop.xy+(screenUV+bend)*photoCrop.zw;
  vec3 behind=texture2D(scenePhoto,clamp(lookup,.001,.999)).rgb;
  behind*=mix(vec3(1.),vec3(.33,.42,.58),night);
  transmitted=mix(transmitted,behind,hasScenePhoto*.75*smoothstep(.22,.91,facing));
  #endif
  vec3 absorption=vec3(.061,.018,.006)*distanceAcross;
  vec3 result=mix(transmitted*(1.-absorption),reflected,fresnel);

  // A warm solar core and a thin cool line on the lower meniscus distinguish
  // the two surfaces as the letter tilts or a tap passes through it.
  vec3 halfVector=normalize(${sun}-viewRay);
  float sheen=max(dot(normal,halfVector),0.);
  vec3 sunTint=mix(vec3(1.,.82,.58),vec3(.55,.78,1.),night);
  result+=sunTint*(1.-.55*night)*(.22*pow(sheen,52.)+1.65*pow(sheen,240.));
  float meniscus=1.-smoothstep(.008,.075,abs(facing-.22));
  result+=mix(vec3(.16,.32,.39),vec3(.14,.25,.36),night)
          *meniscus*(.24+.76*max(-normal.y,0.));
  #ifdef LETTER_WAVES
  result+=sunTint*crestLight*(.17+.96*rim+.31*pow(sheen,8.));
  #endif
  result+=night*vec3(.17,.27,.39)*rim2;
  gl_FragColor = vec4(result,1.);
  #include <colorspace_fragment>
}`;

// CC0 Kloofendal 48d Partly Cloudy (Pure Sky), Poly Haven. The local WebP
// stores log2(1 + scene-linear radiance) / 7 per channel, up to 127.
const bakeSky = `
varying vec3 direction;
uniform sampler2D radiance;
uniform sampler2D panorama;
void main(){
  vec3 d=normalize(direction);
  vec3 cameraSun=${sun};
  vec3 right=normalize(cross(cameraSun,vec3(0.,1.,0.)));
  vec3 up=cross(right,cameraSun);
  float az=.598, el=.837;
  vec3 source=vec3(sin(az)*cos(el),sin(el),-cos(az)*cos(el));
  vec3 east=vec3(cos(az),0.,sin(az));
  vec3 ray=east*dot(d,right)+cross(east,source)*dot(d,up)+source*dot(d,cameraSun);
  float lon=atan(ray.x,-ray.z);
  vec2 uv=vec2(.5+lon/6.283185,.5+asin(clamp(abs(ray.y),0.,1.))/3.141593);
  vec3 sky=exp2(texture2D(radiance,uv).rgb*7.)-1.;
  sky*=mix(vec3(.09,.24,.39),vec3(1.),smoothstep(-.18,.09,ray.y));
  // The hero sky is art-directed. Match its forward view within one cone;
  // the sides and the rear retain the independent HDR cloud banks.
  float longitude=atan(d.x,-d.z), latitude=asin(clamp(d.y,-1.,1.));
  vec2 frame=vec2(.5+.48*sin(longitude*1.75),clamp(.51+.50*sin(latitude*3.),.015,.985));
  vec3 foreground=texture2D(panorama,frame).rgb;
  sky*=vec3(.40,.51,.66);
  sky=mix(sky,foreground,smoothstep(.42,.87,-d.z)*.88);
  float solar=max(dot(d,cameraSun),0.);
  sky+=vec3(1.,.78,.50)*3.*pow(solar,8500.);
  gl_FragColor=vec4(sky,1.);
}`;

type Sky = Awaited<ReturnType<typeof loadPanorama>>;
export function createWaterLight(renderer:T.WebGLRenderer, panorama:Sky){
  const skyScene=new T.Scene();
  const geometry=new T.SphereGeometry(20,32,16);
  const domeVertex='varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
  const skyUniforms={panorama:{value:panorama.photo},radiance:{value:panorama.hdr},time:{value:0},night:{value:0},immersion:{value:0}};
  const bake=new T.ShaderMaterial({uniforms:skyUniforms,side:T.BackSide,vertexShader:domeVertex,fragmentShader:panorama.hdr?bakeSky:skyFragment});
  skyScene.add(new T.Mesh(geometry,bake));
  const size=matchMedia('(max-width: 700px)').matches ? 256 : 384;
  const cube=new T.WebGLCubeRenderTarget(size,{type:T.HalfFloatType,depthBuffer:false,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter});
  new T.CubeCamera(.1,50,cube).update(renderer,skyScene);
  panorama.hdr?.dispose();bake.dispose();
  const uniforms={...skyUniforms,impact:{value:new T.Vector2()},age:{value:-1},sky:{value:cube.texture},pointer:{value:new T.Vector2(0,0)},attention:{value:0}};
  const water=new T.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment});
  return {water,uniforms,dispose(){
    cube.dispose();geometry.dispose();water.dispose();panorama.photo.dispose();
  }};
}

export async function loadPanorama() {
  const loader=new T.TextureLoader();
  const [photo,hdr]=await Promise.all([loader.loadAsync('/environment/ocean-sky-reflection.webp'),
    loader.loadAsync('/environment/kloofendal-sky-log.webp').catch(()=>null)]);
  photo.colorSpace=T.SRGBColorSpace;photo.wrapS=T.RepeatWrapping;
  if(hdr){hdr.colorSpace=T.NoColorSpace;hdr.wrapS=T.RepeatWrapping;}
  return {photo,hdr,dispose(){photo.dispose();hdr?.dispose();}};
}
