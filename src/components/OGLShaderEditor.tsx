import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useEditorStore } from '../store/editorStore';
import { FiZap, FiCheck, FiCode, FiRefreshCw, FiCopy, FiExternalLink } from 'react-icons/fi';
import { getTargetHtmlFile, getTargetJsFile, insertBeforeClosingTag } from '../utils/projectFiles';

/* ══════════════════════════════════════════════════════
   SKEUOMORPHIC COLOR TOKENS
══════════════════════════════════════════════════════ */
const SK = {
  bg:         '#1e1e22',
  surface:    '#2a2a30',
  raised:     '#323238',
  titlebar:   '#252528',
  border:     'rgba(0,0,0,0.55)',
  borderHi:   'rgba(255,255,255,0.13)',
  text:       '#d8d8d8',
  textDim:    '#888890',
  textMuted:  '#555560',
  amber:      '#e5a45a',
  amberDim:   'rgba(229,164,90,0.12)',
  amberGlow:  'rgba(229,164,90,0.28)',
  amberBorder:'rgba(229,164,90,0.45)',
  green:      '#4ec98e',
  red:        '#e05555',
};

const BTN_RAISED  = 'linear-gradient(180deg,#3a3a42 0%,#2e2e35 50%,#2a2a31 100%)';
const BTN_ACTIVE  = 'linear-gradient(180deg,#c8913c 0%,#e5a45a 40%,#c8913c 100%)';
const SHADOW_RAISED  = 'inset 0 1px 0 rgba(255,255,255,0.14),0 2px 6px rgba(0,0,0,0.55),0 1px 2px rgba(0,0,0,0.4)';
const SHADOW_PRESSED = 'inset 0 2px 4px rgba(0,0,0,0.7),inset 0 1px 2px rgba(0,0,0,0.5)';
const SHADOW_SUNKEN  = 'inset 0 2px 5px rgba(0,0,0,0.6),inset 0 1px 2px rgba(0,0,0,0.4)';
const SHADOW_ACTIVE  = `inset 0 1px 0 rgba(229,164,90,0.3),0 0 8px rgba(229,164,90,0.25),0 1px 3px rgba(0,0,0,0.4)`;

/* ══════════════════════════════════════════════════════
   OGL EFFECT PRESETS — Real 3D scenes via raymarching
══════════════════════════════════════════════════════ */
interface Param {
  key: string;
  label: string;
  type: 'range' | 'color' | 'toggle';
  min?: number; max?: number; step?: number;
  defaultVal: number | string | boolean;
}

interface OGLPreset {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  frag: string;
  params: Param[];
  oglCode: (p: Record<string, any>) => string;
}

const BASE_VERT = `#version 300 es
in vec2 a_pos;
void main(){gl_Position=vec4(a_pos,0,1);}
`;

const PRESETS: OGLPreset[] = [
  /* ── 1. OGL Sphere ── */
  {
    id: 'SPHERE', label: 'OGL Sphere', emoji: '🌐', desc: 'Morphing 3D sphere with iridescent surface',
    frag: `#version 300 es
precision highp float;
out vec4 outColor;
uniform float u_time; uniform vec2 u_res;
uniform vec3 u_color; uniform float u_speed; uniform float u_distort;

float hash3(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
float noise(vec3 p){vec3 i=floor(p);vec3 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p,float t){return noise(p+t)*0.5+noise(p*2.-t*0.7)*0.25+noise(p*4.+t*0.5)*0.125;}

float map(vec3 p,float t){float n=fbm(p*1.5,t*0.3);return length(p)-(0.8+n*u_distort*0.35);}
vec3 nrm(vec3 p,float t){vec2 e=vec2(.002,0);return normalize(vec3(map(p+e.xyy,t)-map(p-e.xyy,t),map(p+e.yxy,t)-map(p-e.yxy,t),map(p+e.yyx,t)-map(p-e.yyx,t)));}

void main(){
  vec2 uv=(gl_FragCoord.xy/u_res)*2.-1.; uv.x*=u_res.x/u_res.y;
  float t=u_time*u_speed;
  float ca=cos(t*0.25),sa=sin(t*0.25);
  vec3 ro=vec3(sa*2.2,0.6+sin(t*0.1)*0.3,ca*2.2);
  vec3 fw=normalize(-ro), rt=normalize(cross(vec3(0,1,0),fw)), up=cross(fw,rt);
  vec3 rd=normalize(fw+uv.x*rt*0.7+uv.y*up*0.7);
  float d=0.; bool hit=false;
  for(int i=0;i<80;i++){float s=map(ro+rd*d,t);if(s<.001){hit=true;break;}d+=s;if(d>8.)break;}
  vec3 col=vec3(0.02,0.02,0.06);
  if(hit){
    vec3 p=ro+rd*d, n=nrm(p,t), l=normalize(vec3(1,2,1));
    float diff=max(dot(n,l),0.), spec=pow(max(dot(reflect(-l,n),-rd),0.),48.), rim=pow(1.-max(dot(-rd,n),0.),3.);
    float hue=dot(n,vec3(.577))*3.14+t*0.3;
    vec3 iri=vec3(0.5+0.5*cos(hue),0.5+0.5*cos(hue+2.094),0.5+0.5*cos(hue+4.189));
    col=u_color*diff*0.7+iri*0.4+vec3(spec)+u_color*rim*0.6+vec3(0.04,0.06,0.1)*(1.-diff);
  }
  col+=u_color*0.025/(0.05+length(uv)*0.4);
  outColor=vec4(col,1.);
}`,
    params:[
      {key:'u_color',  label:'Surface',  type:'color', defaultVal:'#4488ff'},
      {key:'u_speed',  label:'Speed',    type:'range', min:.1,max:3,step:.1,defaultVal:1},
      {key:'u_distort',label:'Distort',  type:'range', min:0,max:2,step:.05,defaultVal:0.8},
    ],
    oglCode: (p) => `<!-- OGL Sphere Effect -->
<canvas id="ogl-canvas" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;"></canvas>
<script type="module">
import {Renderer,Camera,Transform,Program,Mesh,Triangle} from 'https://cdn.jsdelivr.net/npm/ogl@0.0.99/src/index.js';
const r=new Renderer({canvas:document.getElementById('ogl-canvas'),dpr:Math.min(devicePixelRatio,2),alpha:true});
const gl=r.gl;
gl.clearColor(0,0,0,0);
const cam=new Camera(gl,{fov:35});cam.position.z=3;
const scene=new Transform();
const prog=new Program(gl,{vertex:\`attribute vec3 position;void main(){gl_Position=vec4(position.xy,0,1);}\`,
fragment:\`precision highp float;uniform float uTime;uniform vec2 uRes;void main(){vec2 uv=(gl_FragCoord.xy/uRes)*2.-1.;float d=length(uv)-(.8+sin(uTime*.5+atan(uv.y,uv.x)*3.)*.15);float g=.02/abs(d);vec3 c=vec3(.27,.53,1.)*g;gl_FragColor=vec4(c,1.);}\`,
uniforms:{uTime:{value:0},uRes:{value:[innerWidth,innerHeight]}}});
const mesh=new Mesh(gl,{geometry:new Triangle(gl),program:prog});mesh.setParent(scene);
window.addEventListener('resize',()=>{r.setSize(innerWidth,innerHeight);prog.uniforms.uRes.value=[innerWidth,innerHeight];});
r.setSize(innerWidth,innerHeight);
(function loop(t){requestAnimationFrame(loop);prog.uniforms.uTime.value=t/1000*${p['u_speed']??1};r.render({scene,camera:cam});})();
</script>`,
  },

  /* ── 2. OGL Torus ── */
  {
    id: 'TORUS', label: 'OGL Torus', emoji: '💫', desc: 'Spinning metallic torus with chromatic glow',
    frag: `#version 300 es
precision highp float;
out vec4 outColor;
uniform float u_time; uniform vec2 u_res;
uniform vec3 u_color; uniform float u_speed; uniform float u_thickness;

float sdTorus(vec3 p,vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}
vec3 rotY(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);}
vec3 rotX(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);}

float map(vec3 p,float t){vec3 q=rotX(rotY(p,t*u_speed*0.8),0.5+sin(t*u_speed*0.3)*0.3);return sdTorus(q,vec2(0.65,u_thickness));}
vec3 nrm(vec3 p,float t){vec2 e=vec2(.002,0);return normalize(vec3(map(p+e.xyy,t)-map(p-e.xyy,t),map(p+e.yxy,t)-map(p-e.yxy,t),map(p+e.yyx,t)-map(p-e.yyx,t)));}

void main(){
  vec2 uv=(gl_FragCoord.xy/u_res)*2.-1.; uv.x*=u_res.x/u_res.y;
  float t=u_time;
  vec3 ro=vec3(0,0,2.8), rd=normalize(vec3(uv,-1.9));
  float d=0.; bool hit=false;
  for(int i=0;i<80;i++){float s=map(ro+rd*d,t);if(s<.001){hit=true;break;}d+=s*0.9;if(d>8.)break;}
  vec3 col=vec3(0.01,0.01,0.03);
  if(hit){
    vec3 p=ro+rd*d, n=nrm(p,t), l=normalize(vec3(1,2,.5));
    float diff=max(dot(n,l),0.), spec=pow(max(dot(reflect(-l,n),-rd),0.),96.), rim=pow(1.-max(dot(-rd,n),0.),4.);
    float fresnel=pow(1.-max(dot(-rd,n),0.),2.);
    vec3 chromatic=vec3(0.5+0.5*cos(rim*3.14),0.5+0.5*cos(rim*3.14+2.),0.5+0.5*cos(rim*3.14+4.));
    col=u_color*(diff*0.7+.15)+spec*1.8+chromatic*rim*0.7+u_color*fresnel*0.4;
  }
  // Ring halo glow
  float r2=length(vec2(length(uv)-0.65*1./(2.8/2.8),uv.y*0.3));
  col+=u_color*exp(-r2*18.)*0.35;
  outColor=vec4(col,1.);
}`,
    params:[
      {key:'u_color',    label:'Metal Tint',type:'color',defaultVal:'#ff8833'},
      {key:'u_speed',    label:'Speed',     type:'range',min:.1,max:3,step:.1,defaultVal:1.2},
      {key:'u_thickness',label:'Thickness', type:'range',min:.05,max:.4,step:.01,defaultVal:.18},
    ],
    oglCode: (p) => `<!-- OGL Torus Effect -->
<canvas id="ogl-canvas" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;"></canvas>
<script type="module">
import {Renderer,Camera,Transform,Program,Mesh,Triangle} from 'https://cdn.jsdelivr.net/npm/ogl@0.0.99/src/index.js';
const r=new Renderer({canvas:document.getElementById('ogl-canvas'),dpr:Math.min(devicePixelRatio,2),alpha:true});
const gl=r.gl;gl.clearColor(0,0,0,0);
const cam=new Camera(gl,{fov:35});cam.position.z=3;
const scene=new Transform();
const prog=new Program(gl,{vertex:\`attribute vec3 position;void main(){gl_Position=vec4(position.xy,0,1);}\`,
fragment:\`precision highp float;uniform float uTime;uniform vec2 uRes;float sdT(vec3 p,vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}void main(){vec2 uv=(gl_FragCoord.xy/uRes)*2.-1.;uv.x*=uRes.x/uRes.y;vec3 ro=vec3(0,0,2.8),rd=normalize(vec3(uv,-1.9));float d=0.;bool h=false;for(int i=0;i<60;i++){vec3 p=ro+rd*d;float a=uTime*${p['u_speed']??1.2}*.8;float c=cos(a),s=sin(a);p=vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);float ss=sdT(p,vec2(0.65,${p['u_thickness']??.18}));if(ss<.001){h=true;break;}d+=ss*.9;if(d>8.)break;}vec3 col=vec3(.01,.01,.03);if(h){col=vec3(1.,.53,.2)*0.8;}gl_FragColor=vec4(col,1.);}\`,
uniforms:{uTime:{value:0},uRes:{value:[innerWidth,innerHeight]}}});
const mesh=new Mesh(gl,{geometry:new Triangle(gl),program:prog});mesh.setParent(scene);
window.addEventListener('resize',()=>{r.setSize(innerWidth,innerHeight);prog.uniforms.uRes.value=[innerWidth,innerHeight];});
r.setSize(innerWidth,innerHeight);
(function loop(t){requestAnimationFrame(loop);prog.uniforms.uTime.value=t/1000;r.render({scene,camera:cam});})();
</script>`,
  },

  /* ── 3. Particle Field ── */
  {
    id: 'PARTICLES', label: 'Particle Field', emoji: '✨', desc: '3D floating particle cloud with depth glow',
    frag: `#version 300 es
precision highp float;
out vec4 outColor;
uniform float u_time; uniform vec2 u_res;
uniform vec3 u_color; uniform float u_speed; uniform float u_size;

float hash31(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5);}
vec3 hash33(vec3 p){return fract(sin(vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))))*43758.5);}

void main(){
  vec2 uv=(gl_FragCoord.xy/u_res)*2.-1.; uv.x*=u_res.x/u_res.y;
  float t=u_time*u_speed;
  vec3 ro=vec3(cos(t*.15)*3.,sin(t*.1)*1.5,sin(t*.15)*3.);
  vec3 fw=normalize(-ro), rt=normalize(cross(vec3(0,1,0),fw)), up=cross(fw,rt);
  vec3 rd=normalize(fw+uv.x*rt*0.7+uv.y*up*0.7);

  vec3 col=vec3(0.01,0.01,0.04);
  float N=24.;
  for(float i=0.;i<24.;i++){
    vec3 seed=vec3(i,i*7.3+1.,i*13.1+2.);
    vec3 pos=(hash33(seed)-0.5)*4.;
    float spd=hash31(seed+3.)*0.4+0.1;
    pos.x+=sin(t*spd+i*2.1)*0.7;
    pos.y+=cos(t*spd*0.7+i*1.7)*0.7;
    pos.z+=sin(t*spd*0.5+i*3.3)*0.5;
    // project to screen
    vec3 toP=pos-ro;
    float tc=dot(toP,rd);
    if(tc<0.) continue;
    vec3 proj=ro+rd*tc;
    float dist=length(proj-pos);
    float g=u_size*0.012/(dist*dist+0.002)*clamp(1.-dist*5.,0.,1.);
    float h=hash31(seed);
    vec3 c=mix(u_color,vec3(0.5+0.5*cos(h*6.28+t),0.5+0.5*cos(h*6.28+t+2.),0.5+0.5*cos(h*6.28+t+4.)),0.4);
    col+=c*g;
  }
  // background nebula haze
  float fog=0.03/(0.01+length(uv)*0.3);
  col+=u_color*fog*0.02;
  outColor=vec4(col,1.);
}`,
    params:[
      {key:'u_color', label:'Tint',  type:'color',defaultVal:'#8844ff'},
      {key:'u_speed', label:'Speed', type:'range',min:.1,max:3,step:.1,defaultVal:1},
      {key:'u_size',  label:'Size',  type:'range',min:.5,max:3,step:.1,defaultVal:1.5},
    ],
    oglCode: (p) => `<!-- OGL Particle Field -->
<canvas id="ogl-canvas" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;"></canvas>
<script type="module">
import {Renderer,Camera,Transform,Program,Geometry,Mesh} from 'https://cdn.jsdelivr.net/npm/ogl@0.0.99/src/index.js';
const r=new Renderer({canvas:document.getElementById('ogl-canvas'),dpr:Math.min(devicePixelRatio,2),alpha:true});
const gl=r.gl;gl.clearColor(0,0,0,0);
const cam=new Camera(gl,{fov:60});cam.position.z=5;
const scene=new Transform();
const N=200;
const pos=new Float32Array(N*3);
for(let i=0;i<N;i++){pos[i*3]=(Math.random()-.5)*6;pos[i*3+1]=(Math.random()-.5)*6;pos[i*3+2]=(Math.random()-.5)*6;}
const geo=new Geometry(gl,{position:{size:3,data:pos}});
const prog=new Program(gl,{vertex:\`attribute vec3 position;uniform mat4 modelViewMatrix,projectionMatrix;void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=${Math.round((p['u_size']??1.5)*4.)}.0/(gl_Position.z+0.1);}\`,
fragment:\`precision highp float;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(${hexToGLSL(p['u_color']??'#8844ff')},1.-d*2.);}  \`,
uniforms:{}});
const mesh=new Mesh(gl,{mode:gl.POINTS,geometry:geo,program:prog});mesh.setParent(scene);
window.addEventListener('resize',()=>r.setSize(innerWidth,innerHeight));
r.setSize(innerWidth,innerHeight);
(function loop(t){requestAnimationFrame(loop);mesh.rotation.y=t/5000;mesh.rotation.x=t/8000;r.render({scene,camera:cam});})();
</script>`,
  },

  /* ── 4. Metaballs ── */
  {
    id: 'META', label: 'Metaballs', emoji: '🫧', desc: 'Fluid 3D metaball blobs merging in space',
    frag: `#version 300 es
precision highp float;
out vec4 outColor;
uniform float u_time; uniform vec2 u_res;
uniform vec3 u_color; uniform float u_speed; uniform float u_smooth;

float smin(float a,float b,float k){float h=max(k-abs(a-b),0.)/k;return min(a,b)-h*h*k*.25;}

float map(vec3 p,float t){
  float s=u_speed;
  vec3 p1=vec3(sin(t*s*.7)*.7,cos(t*s*.5)*.5,sin(t*s*.3)*.4);
  vec3 p2=vec3(cos(t*s*.4)*.6,sin(t*s*.8)*.6,cos(t*s*.6)*.5);
  vec3 p3=vec3(sin(t*s*.9+1.)*.5,cos(t*s*.3+2.)*.7,sin(t*s*.7+1.)*.3);
  vec3 p4=vec3(cos(t*s*.6+3.)*.4,sin(t*s*.4+1.)*.4,cos(t*s*.8+2.)*.6);
  float d1=length(p-p1)-.35;
  float d2=length(p-p2)-.3;
  float d3=length(p-p3)-.32;
  float d4=length(p-p4)-.28;
  return smin(smin(smin(d1,d2,u_smooth),d3,u_smooth),d4,u_smooth);
}
vec3 nrm(vec3 p,float t){vec2 e=vec2(.002,0);return normalize(vec3(map(p+e.xyy,t)-map(p-e.xyy,t),map(p+e.yxy,t)-map(p-e.yxy,t),map(p+e.yyx,t)-map(p-e.yyx,t)));}

void main(){
  vec2 uv=(gl_FragCoord.xy/u_res)*2.-1.; uv.x*=u_res.x/u_res.y;
  float t=u_time;
  float ca=cos(t*0.18),sa=sin(t*0.18);
  vec3 ro=vec3(sa*2.5,.4+sin(t*.12)*.3,ca*2.5);
  vec3 fw=normalize(-ro),rt=normalize(cross(vec3(0,1,0),fw)),up=cross(fw,rt);
  vec3 rd=normalize(fw+uv.x*rt*0.7+uv.y*up*0.7);
  float d=0.; bool hit=false;
  for(int i=0;i<80;i++){float s=map(ro+rd*d,t);if(s<.001){hit=true;break;}d+=s;if(d>6.)break;}
  vec3 col=vec3(0.02,0.01,0.04);
  if(hit){
    vec3 p=ro+rd*d, n=nrm(p,t), l=normalize(vec3(1,2,1));
    float diff=max(dot(n,l),0.), spec=pow(max(dot(reflect(-l,n),-rd),0.),64.);
    float rim=pow(1.-max(dot(-rd,n),0.),4.);
    float ao=0.5+0.5*dot(n,normalize(p));
    vec3 pal=mix(u_color,vec3(.9,.3,.8),ao);
    pal=mix(pal,vec3(.2,.8,1.),rim);
    col=pal*(diff*0.8+.2)+spec*1.2+pal*rim*.5;
  }
  outColor=vec4(col,1.);
}`,
    params:[
      {key:'u_color',  label:'Blob Color', type:'color',defaultVal:'#ff3399'},
      {key:'u_speed',  label:'Speed',      type:'range',min:.1,max:2,step:.05,defaultVal:.8},
      {key:'u_smooth', label:'Smooth',     type:'range',min:.05,max:.6,step:.01,defaultVal:.3},
    ],
    oglCode: (p) => `<!-- OGL Metaballs Effect -->
<canvas id="ogl-canvas" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;"></canvas>
<script type="module">
import {Renderer,Camera,Transform,Program,Mesh,Triangle} from 'https://cdn.jsdelivr.net/npm/ogl@0.0.99/src/index.js';
const r=new Renderer({canvas:document.getElementById('ogl-canvas'),dpr:Math.min(devicePixelRatio,2),alpha:true});
const gl=r.gl;gl.clearColor(0,0,0,0);
const cam=new Camera(gl,{fov:35});
const scene=new Transform();
const prog=new Program(gl,{vertex:\`attribute vec3 position;void main(){gl_Position=vec4(position.xy,0,1);}\`,
fragment:\`precision highp float;uniform float uT;uniform vec2 uR;float sm(float a,float b,float k){float h=max(k-abs(a-b),0.)/k;return min(a,b)-h*h*k*.25;}float map(vec3 p){vec3 a=vec3(sin(uT*.7)*.7,cos(uT*.5)*.5,sin(uT*.3)*.4),b=vec3(cos(uT*.4)*.6,sin(uT*.8)*.6,cos(uT*.6)*.5),c=vec3(sin(uT*.9)*.5,cos(uT*.3)*.7,sin(uT*.7)*.3);return sm(sm(length(p-a)-.35,length(p-b)-.3,.3),length(p-c)-.32,.3);}void main(){vec2 uv=(gl_FragCoord.xy/uR)*2.-1.;uv.x*=uR.x/uR.y;vec3 ro=vec3(0,0,2.5),rd=normalize(vec3(uv,-1.8));float d=0.;bool h=false;for(int i=0;i<64;i++){float s=map(ro+rd*d);if(s<.001){h=true;break;}d+=s;if(d>6.)break;}vec3 col=vec3(.02,.01,.04);if(h){col=vec3(1.,.2,.6)*.9;}gl_FragColor=vec4(col,1.);}\`,
uniforms:{uT:{value:0},uR:{value:[innerWidth,innerHeight]}}});
const mesh=new Mesh(gl,{geometry:new Triangle(gl),program:prog});mesh.setParent(scene);
window.addEventListener('resize',()=>{r.setSize(innerWidth,innerHeight);prog.uniforms.uR.value=[innerWidth,innerHeight];});
r.setSize(innerWidth,innerHeight);
(function loop(t){requestAnimationFrame(loop);prog.uniforms.uT.value=t/1000*${p['u_speed']??.8};r.render({scene,camera:cam});})();
</script>`,
  },

  /* ── 5. Crystal Lattice ── */
  {
    id: 'CRYSTAL', label: 'Crystal Lattice', emoji: '💎', desc: 'Infinite 3D crystal grid with reflections',
    frag: `#version 300 es
precision highp float;
out vec4 outColor;
uniform float u_time; uniform vec2 u_res;
uniform vec3 u_color; uniform float u_speed; uniform float u_scale;

float sdBox(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
float sdOct(vec3 p,float s){return (dot(abs(p),vec3(1.))-s)/sqrt(3.);}

vec3 rotY(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);}

float map(vec3 p,float t){
  p=rotY(p,t*u_speed*0.2);
  vec3 q=fract(p*u_scale)-.5;
  q/=u_scale;
  float d1=sdOct(q,.18/u_scale);
  float d2=sdBox(q,vec3(.12/u_scale));
  return max(d1,-d2+.04/u_scale);
}
vec3 nrm(vec3 p,float t){vec2 e=vec2(.001,0);return normalize(vec3(map(p+e.xyy,t)-map(p-e.xyy,t),map(p+e.yxy,t)-map(p-e.yxy,t),map(p+e.yyx,t)-map(p-e.yyx,t)));}

void main(){
  vec2 uv=(gl_FragCoord.xy/u_res)*2.-1.; uv.x*=u_res.x/u_res.y;
  float t=u_time;
  float ca=cos(t*u_speed*.15),sa=sin(t*u_speed*.15);
  vec3 ro=vec3(sa*2.,0.4+cos(t*u_speed*.1)*.5,ca*2.);
  vec3 fw=normalize(vec3(0,0,0)-ro),rt=normalize(cross(vec3(0,1,0),fw)),up=cross(fw,rt);
  vec3 rd=normalize(fw+uv.x*rt*0.8+uv.y*up*0.8);
  float d=0.; bool hit=false; float glow=0.;
  for(int i=0;i<100;i++){
    float s=map(ro+rd*d,t);
    glow+=.005/(s*s+.001);
    if(s<.0005){hit=true;break;}
    d+=max(s,.001);
    if(d>8.)break;
  }
  vec3 col=u_color*glow*0.012;
  if(hit){
    vec3 p=ro+rd*d, n=nrm(p,t), l=normalize(vec3(1,2,1));
    float diff=max(dot(n,l),0.), spec=pow(max(dot(reflect(-l,n),-rd),0.),96.);
    float fresnel=pow(1.-max(dot(-rd,n),0.),3.);
    float hue=dot(fract(p*u_scale),vec3(.3,.5,.7))*6.28+t;
    vec3 pal=vec3(0.5+0.5*cos(hue),0.5+0.5*cos(hue+2.094),0.5+0.5*cos(hue+4.189));
    col+=u_color*(diff*0.5+.1)+pal*fresnel*0.8+spec*2.+vec3(.2,.4,1.)*spec*.5;
  }
  col=pow(col,vec3(.8));
  outColor=vec4(col,1.);
}`,
    params:[
      {key:'u_color', label:'Crystal',type:'color',defaultVal:'#00ccff'},
      {key:'u_speed', label:'Speed',  type:'range',min:.1,max:2,step:.05,defaultVal:.7},
      {key:'u_scale', label:'Scale',  type:'range',min:.5,max:3,step:.1,defaultVal:1.5},
    ],
    oglCode: (p) => `<!-- OGL Crystal Lattice -->
<canvas id="ogl-canvas" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;"></canvas>
<script type="module">
import {Renderer,Camera,Transform,Program,Mesh,Triangle} from 'https://cdn.jsdelivr.net/npm/ogl@0.0.99/src/index.js';
const r=new Renderer({canvas:document.getElementById('ogl-canvas'),dpr:Math.min(devicePixelRatio,2),alpha:true});
const gl=r.gl;gl.clearColor(0,0,0,0);
const cam=new Camera(gl);
const scene=new Transform();
const prog=new Program(gl,{vertex:\`attribute vec3 position;void main(){gl_Position=vec4(position.xy,0,1);}\`,
fragment:\`precision highp float;uniform float uT;uniform vec2 uR;float sdO(vec3 p,float s){return(dot(abs(p),vec3(1.))-s)/sqrt(3.);}float map(vec3 p){vec3 q=fract(p*${p['u_scale']??1.5})-.5;float sc=${p['u_scale']??1.5};q/=sc;return sdO(q,.18/sc);}void main(){vec2 uv=(gl_FragCoord.xy/uR)*2.-1.;uv.x*=uR.x/uR.y;float ca=cos(uT*.15),sa=sin(uT*.15);vec3 ro=vec3(sa*2.,.4,ca*2.),fw=normalize(-ro),rt=normalize(cross(vec3(0,1,0),fw)),up=cross(fw,rt);vec3 rd=normalize(fw+uv.x*rt*.8+uv.y*up*.8);float d=0.,gl2=0.;bool h=false;for(int i=0;i<80;i++){float s=map(ro+rd*d);gl2+=.005/(s*s+.001);if(s<.001){h=true;break;}d+=max(s,.001);if(d>8.)break;}vec3 col=vec3(0,0.8,1)*gl2*.01;if(h)col+=vec3(0,0.8,1)*.5;gl_FragColor=vec4(col,1.);}\`,
uniforms:{uT:{value:0},uR:{value:[innerWidth,innerHeight]}}});
const mesh=new Mesh(gl,{geometry:new Triangle(gl),program:prog});mesh.setParent(scene);
window.addEventListener('resize',()=>{r.setSize(innerWidth,innerHeight);prog.uniforms.uR.value=[innerWidth,innerHeight];});
r.setSize(innerWidth,innerHeight);
(function loop(t){requestAnimationFrame(loop);prog.uniforms.uT.value=t/1000*${p['u_speed']??.7};r.render({scene,camera:cam});})();
</script>`,
  },

  /* ── 6. DNA Helix ── */
  {
    id: 'DNA', label: 'DNA Helix', emoji: '🧬', desc: 'Rotating double helix with connecting rungs',
    frag: `#version 300 es
precision highp float;
out vec4 outColor;
uniform float u_time; uniform vec2 u_res;
uniform vec3 u_color; uniform float u_speed; uniform float u_pitch;

float sdCapsule(vec3 p,vec3 a,vec3 b,float r){vec3 ab=b-a,ap=p-a;float t=clamp(dot(ap,ab)/dot(ab,ab),0.,1.);return length(ap-ab*t)-r;}

vec3 rotZ(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x-s*p.y,s*p.x+c*p.y,p.z);}

float mapHelix(vec3 p,float t,out int strand){
  float best=1e10; strand=0;
  float rots=u_pitch;
  int N=12;
  for(int i=-N;i<=N;i++){
    float fi=float(i);
    float angle1=fi*6.28/rots+t*u_speed;
    float angle2=angle1+3.14159;
    float y=fi*.4;
    vec3 a1=vec3(cos(angle1)*.4,y,sin(angle1)*.4);
    vec3 b1=vec3(cos(angle1+6.28/rots)*.4,y+.4,sin(angle1+6.28/rots)*.4);
    vec3 a2=vec3(cos(angle2)*.4,y,sin(angle2)*.4);
    vec3 b2=vec3(cos(angle2+6.28/rots)*.4,y+.4,sin(angle2+6.28/rots)*.4);
    float d1=sdCapsule(p,a1,b1,.06);
    float d2=sdCapsule(p,a2,b2,.06);
    // Rungs connecting strands
    vec3 m1=a1;vec3 m2=a2;
    float dr=sdCapsule(p,m1,m2,.03);
    if(d1<best){best=d1;strand=1;}
    if(d2<best){best=d2;strand=2;}
    if(dr<best){best=dr;strand=3;}
  }
  return best;
}

vec3 nrmH(vec3 p,float t){vec2 e=vec2(.002,0);int s;return normalize(vec3(mapHelix(p+e.xyy,t,s)-mapHelix(p-e.xyy,t,s),mapHelix(p+e.yxy,t,s)-mapHelix(p-e.yxy,t,s),mapHelix(p+e.yyx,t,s)-mapHelix(p-e.yyx,t,s)));}

void main(){
  vec2 uv=(gl_FragCoord.xy/u_res)*2.-1.; uv.x*=u_res.x/u_res.y;
  float t=u_time;
  vec3 ro=vec3(sin(t*u_speed*.15)*2.2,sin(t*u_speed*.07)*.5,cos(t*u_speed*.15)*2.2);
  vec3 fw=normalize(vec3(0,0,0)-ro),rt=normalize(cross(vec3(0,1,0),fw)),up=cross(fw,rt);
  vec3 rd=normalize(fw+uv.x*rt*0.7+uv.y*up*0.7);
  float d=0.; bool hit=false; int strand=0;
  for(int i=0;i<80;i++){
    float s=mapHelix(ro+rd*d,t,strand);
    if(s<.001){hit=true;break;}
    d+=s*.8; if(d>8.)break;
  }
  vec3 col=vec3(0.01,0.01,0.04);
  if(hit){
    vec3 p=ro+rd*d, n=nrmH(p,t), l=normalize(vec3(1,2,1));
    float diff=max(dot(n,l),0.), spec=pow(max(dot(reflect(-l,n),-rd),0.),48.), rim=pow(1.-max(dot(-rd,n),0.),3.);
    vec3 c=strand==1 ? u_color : strand==2 ? vec3(1.-u_color.r,1.-u_color.g,u_color.b) : vec3(.8,.8,.8);
    col=c*(diff*0.8+.2)+spec+c*rim*.5;
  }
  outColor=vec4(col,1.);
}`,
    params:[
      {key:'u_color', label:'Strand A',type:'color',defaultVal:'#44aaff'},
      {key:'u_speed', label:'Speed',   type:'range',min:.1,max:2,step:.05,defaultVal:.8},
      {key:'u_pitch', label:'Pitch',   type:'range',min:2,max:8,step:.5,defaultVal:4},
    ],
    oglCode: (p) => `<!-- OGL DNA Helix Effect -->
<canvas id="ogl-canvas" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;"></canvas>
<script type="module">
import {Renderer,Camera,Transform,Program,Mesh,Triangle} from 'https://cdn.jsdelivr.net/npm/ogl@0.0.99/src/index.js';
const r=new Renderer({canvas:document.getElementById('ogl-canvas'),dpr:Math.min(devicePixelRatio,2),alpha:true});
const gl=r.gl;gl.clearColor(0,0,0,0);
const cam=new Camera(gl);
const scene=new Transform();
const prog=new Program(gl,{vertex:\`attribute vec3 position;void main(){gl_Position=vec4(position.xy,0,1);}\`,
fragment:\`precision highp float;uniform float uT;uniform vec2 uR;float sdC(vec3 p,vec3 a,vec3 b,float r){vec3 ab=b-a,ap=p-a;float t=clamp(dot(ap,ab)/dot(ab,ab),0.,1.);return length(ap-ab*t)-r;}float map(vec3 p){float d=1e10;for(int i=-8;i<=8;i++){float fi=float(i),a1=fi*1.5708+uT,a2=a1+3.14159,y=fi*.4;vec3 A=vec3(cos(a1)*.4,y,sin(a1)*.4),B=vec3(cos(a1+1.5708)*.4,y+.4,sin(a1+1.5708)*.4),C=vec3(cos(a2)*.4,y,sin(a2)*.4),D=vec3(cos(a2+1.5708)*.4,y+.4,sin(a2+1.5708)*.4);d=min(d,min(min(sdC(p,A,B,.06),sdC(p,C,D,.06)),sdC(p,A,C,.03)));}return d;}void main(){vec2 uv=(gl_FragCoord.xy/uR)*2.-1.;uv.x*=uR.x/uR.y;vec3 ro=vec3(sin(uT*.15)*2.2,.0,cos(uT*.15)*2.2),fw=normalize(-ro),rt=normalize(cross(vec3(0,1,0),fw)),up=cross(fw,rt);vec3 rd=normalize(fw+uv.x*rt*.7+uv.y*up*.7);float d=0.;bool h=false;for(int i=0;i<64;i++){float s=map(ro+rd*d);if(s<.001){h=true;break;}d+=s*.8;if(d>8.)break;}vec3 col=vec3(.01,.01,.04);if(h)col=vec3(.27,.67,1.);gl_FragColor=vec4(col,1.);}\`,
uniforms:{uT:{value:0},uR:{value:[innerWidth,innerHeight]}}});
const mesh=new Mesh(gl,{geometry:new Triangle(gl),program:prog});mesh.setParent(scene);
window.addEventListener('resize',()=>{r.setSize(innerWidth,innerHeight);prog.uniforms.uR.value=[innerWidth,innerHeight];});
r.setSize(innerWidth,innerHeight);
(function loop(t){requestAnimationFrame(loop);prog.uniforms.uT.value=t/1000*${p['u_speed']??.8};r.render({scene,camera:cam});})();
</script>`,
  },

  /* ── 7. Cosmic Ring ── */
  {
    id: 'RING', label: 'Cosmic Ring', emoji: '🪐', desc: 'Glowing planetary ring with particle halo',
    frag: `#version 300 es
precision highp float;
out vec4 outColor;
uniform float u_time; uniform vec2 u_res;
uniform vec3 u_color; uniform float u_speed; uniform float u_rings;

float sdTorus(vec3 p,vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}
vec3 rotX(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);}
float hash(float n){return fract(sin(n)*43758.5);}

float map(vec3 p,float t){
  vec3 q=rotX(p,0.5);
  float d=1e10;
  float N=u_rings;
  for(float i=0.;i<6.;i++){
    if(i>=N)break;
    float r=0.6+i*0.22;
    float w=0.025+hash(i)*0.02;
    d=min(d,sdTorus(q,vec2(r,w)));
  }
  // Center sphere
  d=min(d,length(p)-.2);
  return d;
}
vec3 nrm(vec3 p,float t){vec2 e=vec2(.001,0);return normalize(vec3(map(p+e.xyy,t)-map(p-e.xyy,t),map(p+e.yxy,t)-map(p-e.yxy,t),map(p+e.yyx,t)-map(p-e.yyx,t)));}

void main(){
  vec2 uv=(gl_FragCoord.xy/u_res)*2.-1.; uv.x*=u_res.x/u_res.y;
  float t=u_time*u_speed;
  float ca=cos(t*.2),sa=sin(t*.2);
  vec3 ro=vec3(sa*3.,0.8+sin(t*.1)*.3,ca*3.);
  vec3 fw=normalize(-ro),rt=normalize(cross(vec3(0,1,0),fw)),up=cross(fw,rt);
  vec3 rd=normalize(fw+uv.x*rt*0.7+uv.y*up*0.7);
  float d=0.; bool hit=false; float glow=0.;
  for(int i=0;i<80;i++){
    float s=map(ro+rd*d,t);
    glow+=0.003/(s*s+.002);
    if(s<.001){hit=true;break;}
    d+=s*.8; if(d>10.)break;
  }
  vec3 col=u_color*glow*.015;
  if(hit){
    vec3 p=ro+rd*d, n=nrm(p,t), l=normalize(vec3(1,2,1));
    float diff=max(dot(n,l),0.), spec=pow(max(dot(reflect(-l,n),-rd),0.),64.), rim=pow(1.-max(dot(-rd,n),0.),3.);
    float dist2center=length(p);
    float ringHue=atan(p.z,p.x)+t*.5;
    vec3 pal=vec3(0.5+0.5*cos(ringHue),0.5+0.5*cos(ringHue+2.),0.5+0.5*cos(ringHue+4.));
    col+=mix(u_color,pal,.4)*(diff*.8+.15)+spec+u_color*rim*.7;
  }
  // Particles
  for(float i=0.;i<30.;i++){
    float a=i*2.399+t*.3;
    float ri=0.6+fract(i*.137)*0.9;
    vec3 pp=rotX(vec3(cos(a)*ri,0.,sin(a)*ri),0.5);
    vec3 toP=pp-ro;
    float tc=dot(toP,rd);
    if(tc<0.) continue;
    float dist=length(ro+rd*tc-pp);
    col+=u_color*0.004/(dist*dist+.0005);
  }
  outColor=vec4(col,1.);
}`,
    params:[
      {key:'u_color', label:'Ring Color', type:'color',defaultVal:'#ffaa44'},
      {key:'u_speed', label:'Speed',      type:'range',min:.1,max:2,step:.05,defaultVal:.8},
      {key:'u_rings', label:'Ring Count', type:'range',min:1,max:6,step:1,defaultVal:4},
    ],
    oglCode: (p) => `<!-- OGL Cosmic Ring Effect -->
<canvas id="ogl-canvas" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;"></canvas>
<script type="module">
import {Renderer,Camera,Transform,Program,Mesh,Triangle} from 'https://cdn.jsdelivr.net/npm/ogl@0.0.99/src/index.js';
const r=new Renderer({canvas:document.getElementById('ogl-canvas'),dpr:Math.min(devicePixelRatio,2),alpha:true});
const gl=r.gl;gl.clearColor(0,0,0,0);
const cam=new Camera(gl);
const scene=new Transform();
const prog=new Program(gl,{vertex:\`attribute vec3 position;void main(){gl_Position=vec4(position.xy,0,1);}\`,
fragment:\`precision highp float;uniform float uT;uniform vec2 uR;float sdT(vec3 p,vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}float map(vec3 p){float c=cos(.5),s=sin(.5),d=1e10;vec3 q=vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);for(float i=0.;i<${Math.round(p['u_rings']??4)}.;i++){d=min(d,sdT(q,vec2(.6+i*.22,.03)));}return min(d,length(p)-.2);}void main(){vec2 uv=(gl_FragCoord.xy/uR)*2.-1.;uv.x*=uR.x/uR.y;float ca=cos(uT*.2),sa=sin(uT*.2);vec3 ro=vec3(sa*3.,.8,ca*3.),fw=normalize(-ro),rt=normalize(cross(vec3(0,1,0),fw)),up=cross(fw,rt);vec3 rd=normalize(fw+uv.x*rt*.7+uv.y*up*.7);float d=0.,g=0.;bool h=false;for(int i=0;i<80;i++){float s=map(ro+rd*d);g+=.003/(s*s+.002);if(s<.001){h=true;break;}d+=s*.8;if(d>10.)break;}vec3 col=vec3(1.,.67,.27)*g*.015;if(h)col+=vec3(1.,.67,.27)*.7;gl_FragColor=vec4(col,1.);}\`,
uniforms:{uT:{value:0},uR:{value:[innerWidth,innerHeight]}}});
const mesh=new Mesh(gl,{geometry:new Triangle(gl),program:prog});mesh.setParent(scene);
window.addEventListener('resize',()=>{r.setSize(innerWidth,innerHeight);prog.uniforms.uR.value=[innerWidth,innerHeight];});
r.setSize(innerWidth,innerHeight);
(function loop(t){requestAnimationFrame(loop);prog.uniforms.uT.value=t/1000*${p['u_speed']??.8};r.render({scene,camera:cam});})();
</script>`,
  },

  /* ── 8. Fractal Terrain ── */
  {
    id: 'TERRAIN', label: 'Fractal Terrain', emoji: '🏔️', desc: 'Raymarched 3D fractal mountain terrain',
    frag: `#version 300 es
precision highp float;
out vec4 outColor;
uniform float u_time; uniform vec2 u_res;
uniform vec3 u_color; uniform float u_speed; uniform float u_height;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<6;i++){v+=a*noise(p);p=p*2.+vec2(1.7,9.2);a*=.5;}return v;}

float terrain(vec3 p,float t){
  return p.y - fbm(p.xz*0.5+t*u_speed*.05)*u_height;
}

vec3 nrmT(vec3 p,float t){float e=.01;return normalize(vec3(terrain(p+vec3(e,0,0),t)-terrain(p-vec3(e,0,0),t),terrain(p+vec3(0,e,0),t)-terrain(p-vec3(0,e,0),t),terrain(p+vec3(0,0,e),t)-terrain(p-vec3(0,0,e),t)));}

void main(){
  vec2 uv=(gl_FragCoord.xy/u_res)*2.-1.; uv.x*=u_res.x/u_res.y;
  float t=u_time;
  vec3 ro=vec3(t*u_speed*.3,1.5+u_height*.2,.0);
  vec3 rd=normalize(vec3(uv.x,uv.y-0.2,-1.5));
  vec3 col=vec3(0.03,0.04,0.1);
  float d=0.; bool hit=false;
  for(int i=0;i<80;i++){
    vec3 p=ro+rd*d;
    float s=terrain(p,t);
    if(s<.005){hit=true;break;}
    d+=max(s*.4,.01);
    if(d>20.)break;
  }
  if(hit){
    vec3 p=ro+rd*d, n=nrmT(p,t);
    float l=max(dot(n,normalize(vec3(1,2,1))),0.);
    float h=fbm(p.xz*.5+t*u_speed*.05);
    vec3 rock=mix(vec3(.15,.12,.1),vec3(.35,.3,.25),h);
    vec3 snow=vec3(.85,.9,1.);
    vec3 grass=u_color*.4;
    float blend=smoothstep(.4,.6,h);
    float snowLine=smoothstep(.75,.9,h+p.y*.1);
    col=mix(mix(grass,rock,blend),snow,snowLine)*l;
    col+=u_color*.08*(1.-l);
    // Fog
    float fog=clamp(d/18.,0.,1.);
    col=mix(col,vec3(0.05,0.07,0.15),fog);
  }
  // Sky gradient
  if(!hit){
    float y=(uv.y+1.)*.5;
    col=mix(vec3(0.02,0.03,0.08),vec3(0.1,0.15,0.35),y);
    col+=u_color*0.15*(1.-y);
  }
  outColor=vec4(col,1.);
}`,
    params:[
      {key:'u_color',  label:'Base Color', type:'color',defaultVal:'#336622'},
      {key:'u_speed',  label:'Fly Speed',  type:'range',min:.1,max:3,step:.1,defaultVal:1},
      {key:'u_height', label:'Height',     type:'range',min:.3,max:2,step:.05,defaultVal:1},
    ],
    oglCode: (p) => `<!-- OGL Fractal Terrain -->
<canvas id="ogl-canvas" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;"></canvas>
<script type="module">
import {Renderer,Camera,Transform,Program,Mesh,Triangle} from 'https://cdn.jsdelivr.net/npm/ogl@0.0.99/src/index.js';
const r=new Renderer({canvas:document.getElementById('ogl-canvas'),dpr:Math.min(devicePixelRatio,2)});
const gl=r.gl;
const cam=new Camera(gl);
const scene=new Transform();
const prog=new Program(gl,{vertex:\`attribute vec3 position;void main(){gl_Position=vec4(position.xy,0,1);}\`,
fragment:\`precision highp float;uniform float uT;uniform vec2 uR;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<6;i++){v+=a*noise(p);p*=2.;a*=.5;}return v;}float H(vec3 p){return p.y-fbm(p.xz*.5)*${p['u_height']??1};}void main(){vec2 uv=(gl_FragCoord.xy/uR)*2.-1.;uv.x*=uR.x/uR.y;vec3 ro=vec3(uT*.3,1.5,.0),rd=normalize(vec3(uv.x,uv.y-.2,-1.5));float d=0.;bool h=false;for(int i=0;i<80;i++){float s=H(ro+rd*d);if(s<.005){h=true;break;}d+=max(s*.4,.01);if(d>20.)break;}vec3 col=vec3(.03,.04,.1);if(h){vec3 p=ro+rd*d;col=mix(vec3(.2,.4,.1),vec3(.4,.35,.25),fbm(p.xz*.5))*.8;}gl_FragColor=vec4(col,1.);}\`,
uniforms:{uT:{value:0},uR:{value:[innerWidth,innerHeight]}}});
const mesh=new Mesh(gl,{geometry:new Triangle(gl),program:prog});mesh.setParent(scene);
window.addEventListener('resize',()=>{r.setSize(innerWidth,innerHeight);prog.uniforms.uR.value=[innerWidth,innerHeight];});
r.setSize(innerWidth,innerHeight);
(function loop(t){requestAnimationFrame(loop);prog.uniforms.uT.value=t/1000*${p['u_speed']??1};r.render({scene,camera:cam});})();
</script>`,
  },
];

/* ── helper to convert hex color to GLSL vec3 string ── */
function hexToGLSL(hex: string): string {
  const c = hex.replace('#', '');
  const r = (parseInt(c.substring(0,2),16)/255).toFixed(2);
  const g = (parseInt(c.substring(2,4),16)/255).toFixed(2);
  const b = (parseInt(c.substring(4,6),16)/255).toFixed(2);
  return `vec3(${r},${g},${b})`;
}

/* ══════════════════════════════════════════════════════
   WEBGL CANVAS RENDERER HOOK
══════════════════════════════════════════════════════ */
function useOGLRenderer(preset: OGLPreset, params: Record<string, any>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const startRef  = useRef(performance.now());

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const gl = canvas.getContext('webgl2'); if (!gl) return;

    function compileShader(type: number, src: string): WebGLShader | null {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('OGL shader:', gl.getShaderInfoLog(s)); gl.deleteShader(s); return null; }
      return s;
    }
    const vs = compileShader(gl.VERTEX_SHADER, BASE_VERT);
    const fs = compileShader(gl.FRAGMENT_SHADER, preset.frag);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn('OGL link:', gl.getProgramInfoLog(prog)); return; }

    const quad = new Float32Array([-1,-1,1,-1,-1,1,1,1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    startRef.current = performance.now();
    let alive = true;
    const render = () => {
      if (!alive) return;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      gl.useProgram(prog);
      const t = (performance.now() - startRef.current) / 1000;

      const setU = (name: string, ...v: number[]) => {
        const ul = gl.getUniformLocation(prog, name);
        if (!ul) return;
        if (v.length === 1) gl.uniform1f(ul, v[0]);
        else if (v.length === 2) gl.uniform2f(ul, v[0], v[1]);
        else if (v.length === 3) gl.uniform3f(ul, v[0], v[1], v[2]);
      };
      setU('u_time', t);
      setU('u_res', w, h);
      preset.params.forEach(p2 => {
        const v = params[p2.key] ?? p2.defaultVal;
        if (p2.type === 'color') {
          const hex = String(v).replace('#','');
          setU(p2.key, parseInt(hex.substring(0,2),16)/255, parseInt(hex.substring(2,4),16)/255, parseInt(hex.substring(4,6),16)/255);
        } else {
          setU(p2.key, Number(v));
        }
      });
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [preset, params]);

  return canvasRef;
}

/* ══════════════════════════════════════════════════════
   SKEUOMORPHIC BUTTON
══════════════════════════════════════════════════════ */
function SkuBtn({ onClick, children, active, title, danger }: {
  onClick: () => void; children: React.ReactNode; active?: boolean;
  title?: string; danger?: boolean;
}) {
  const [press, setPress] = useState(false);
  return (
    <button
      title={title}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      onMouseLeave={() => setPress(false)}
      onClick={onClick}
      style={{
        display:'flex', alignItems:'center', gap:4,
        padding:'3px 10px', borderRadius:5, cursor:'pointer',
        fontSize:10, fontFamily:'inherit', fontWeight:700,
        letterSpacing:'0.06em', textTransform:'uppercase',
        border:`1px solid ${active ? 'rgba(180,110,20,0.6)' : danger ? 'rgba(200,60,60,0.5)' : 'rgba(0,0,0,0.5)'}`,
        background: active ? BTN_ACTIVE : danger ? 'linear-gradient(180deg,#5a2020 0%,#3a1515 100%)' : press ? 'linear-gradient(180deg,#1e1e22 0%,#222226 100%)' : BTN_RAISED,
        color: active ? '#1a0d00' : danger ? '#ff8888' : SK.textDim,
        boxShadow: press ? SHADOW_PRESSED : active ? SHADOW_ACTIVE : SHADOW_RAISED,
        textShadow:`0 1px 1px rgba(0,0,0,${active ? 0.2 : 0.5})`,
        transform: press ? 'translateY(1px)' : 'none',
        transition:'color 0.1s, background 0.1s',
        userSelect:'none',
      }}
    >{children}</button>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
const OGLShaderEditor: React.FC = () => {
  const { files, activeFileId, updateFileContent, showNotification } = useEditorStore();
  const htmlFile = getTargetHtmlFile(files, activeFileId);

  const [presetId, setPresetId]     = useState(PRESETS[0].id);
  const [params, setParams]         = useState<Record<string, any>>({});
  const [showCode, setShowCode]     = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [appliedMsg, setAppliedMsg] = useState(false);
  const [activeTab, setActiveTab]   = useState<'presets'|'controls'>('presets');

  const preset = useMemo(() => PRESETS.find(p => p.id === presetId)!, [presetId]);

  useEffect(() => {
    const defaults: Record<string, any> = {};
    preset.params.forEach(p => { defaults[p.key] = p.defaultVal; });
    setParams(defaults);
  }, [preset]);

  const stableParams = useMemo(() => params, [JSON.stringify(params)]);
  const canvasRef = useOGLRenderer(preset, stableParams);

  const setProp = (key: string, value: any) => setParams(prev => ({ ...prev, [key]: value }));
  const resetParams = () => {
    const defaults: Record<string, any> = {};
    preset.params.forEach(p => { defaults[p.key] = p.defaultVal; });
    setParams(defaults);
  };

  const getOGLCode = () => preset.oglCode(params);

  const copyCode = () => {
    navigator.clipboard.writeText(getOGLCode()).then(() => {
      setCodeCopied(true); setTimeout(() => setCodeCopied(false), 1500);
    });
  };

  const applyToProject = () => {
    if (!htmlFile) { showNotification('No HTML file found'); return; }
    try {
      const code = getOGLCode();
      const newContent = insertBeforeClosingTag(htmlFile.content, '</body>', code);
      updateFileContent(htmlFile.id, newContent);
      setAppliedMsg(true);
      showNotification(`✦ ${preset.label} applied to ${htmlFile.name}`);
      setTimeout(() => setAppliedMsg(false), 2200);
    } catch {
      showNotification('Could not insert OGL code into HTML');
    }
  };

  /* ── Controls renderer ── */
  const renderControl = (p: Param) => {
    const val = params[p.key] ?? p.defaultVal;
    if (p.type === 'color') return (
      <div key={p.key} style={{display:'flex',alignItems:'center',gap:7,marginBottom:5}}>
        <label style={{fontSize:10,color:SK.textMuted,width:80,flexShrink:0,textShadow:'0 1px 1px rgba(0,0,0,0.5)'}}>{p.label}</label>
        <input type="color" value={val as string}
          onChange={e => setProp(p.key, e.target.value)}
          style={{width:34,height:24,padding:2,cursor:'pointer',background:'rgba(0,0,0,0.4)',border:'1px solid rgba(0,0,0,0.5)',borderRadius:4,boxShadow:SHADOW_RAISED}} />
        <span style={{fontSize:10,color:SK.textDim,fontFamily:'monospace'}}>{val as string}</span>
      </div>
    );
    if (p.type === 'range') return (
      <div key={p.key} style={{marginBottom:7}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
          <label style={{fontSize:10,color:SK.textMuted,textShadow:'0 1px 1px rgba(0,0,0,0.5)'}}>{p.label}</label>
          <span style={{fontSize:10,color:SK.amber,fontFamily:'monospace',fontWeight:700}}>{(val as number).toFixed(2)}</span>
        </div>
        <input type="range"
          min={p.min} max={p.max} step={p.step} value={val as number}
          onChange={e => setProp(p.key, parseFloat(e.target.value))}
          style={{width:'100%'}} />
      </div>
    );
    return null;
  };

  return (
    <div style={{
      display:'flex', flexDirection:'column', height:'100%',
      background:SK.bg, color:SK.text,
      fontFamily:"'Inter',-apple-system,sans-serif", fontSize:12,
      overflow:'hidden',
    }}>

      {/* ── SKEUOMORPHIC HEADER ── */}
      <div style={{
        padding:'0 12px', height:38, flexShrink:0,
        display:'flex', alignItems:'center', gap:8,
        background:'linear-gradient(180deg,#2e2e34 0%,#252528 50%,#222225 100%)',
        borderBottom:'1px solid rgba(0,0,0,0.6)',
        boxShadow:'0 1px 0 rgba(255,255,255,0.07),0 2px 8px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          width:26, height:26, borderRadius:6, flexShrink:0,
          background:'linear-gradient(145deg,#1a4a7a 0%,#2266cc 50%,#1a55aa 100%)',
          border:'1px solid rgba(0,0,0,0.5)',
          boxShadow:'inset 0 1px 0 rgba(255,255,255,0.2),0 2px 6px rgba(0,0,0,0.5)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:13, userSelect:'none',
        }}>⬡</div>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:'#e8e8e8',lineHeight:1,textShadow:'0 1px 2px rgba(0,0,0,0.6)'}}>
            OGL 3D Effects
          </div>
          <div style={{fontSize:9,color:SK.textMuted,marginTop:1}}>Real-Time 3D Raymarching · OGL.js Embed</div>
        </div>
        <div style={{flex:1}} />
        <SkuBtn onClick={() => setShowCode(p => !p)} active={showCode} title="Show OGL.js embed code">
          <FiCode size={10} /> OGL Code
        </SkuBtn>
        <SkuBtn onClick={resetParams} title="Reset to defaults">
          <FiRefreshCw size={10} /> Reset
        </SkuBtn>
      </div>

      {/* ── LIVE 3D CANVAS ── */}
      <div style={{
        flex:'0 0 170px', position:'relative',
        borderBottom:'1px solid rgba(0,0,0,0.5)',
        boxShadow:'inset 0 -1px 0 rgba(255,255,255,0.05)',
        background:'#000',
      }}>
        <canvas ref={canvasRef} style={{width:'100%',height:'100%',display:'block'}} />
        {/* Badges */}
        <div style={{position:'absolute',top:6,right:8,display:'flex',gap:4,pointerEvents:'none'}}>
          <span style={{fontSize:8,padding:'2px 7px',borderRadius:3,fontWeight:700,letterSpacing:'0.08em',background:'rgba(0,0,0,0.65)',border:'1px solid rgba(255,255,255,0.1)',color:'#666'}}>LIVE 3D</span>
          <span style={{fontSize:8,padding:'2px 7px',borderRadius:3,fontWeight:700,background:'rgba(20,55,200,0.35)',border:'1px solid rgba(60,100,255,0.3)',color:'#88aaff'}}>OGL</span>
        </div>
        {/* Preset label */}
        <div style={{position:'absolute',bottom:6,left:8,pointerEvents:'none'}}>
          <span style={{fontSize:9,padding:'2px 8px',borderRadius:3,fontWeight:700,background:'rgba(0,0,0,0.65)',border:'1px solid rgba(255,255,255,0.08)',color:SK.amber}}>{preset.emoji} {preset.label}</span>
        </div>
        {/* Apply button */}
        <button onClick={applyToProject}
          style={{
            position:'absolute',bottom:6,right:8,
            background:appliedMsg ? 'rgba(78,201,142,0.25)' : 'rgba(229,164,90,0.18)',
            border:`1px solid ${appliedMsg ? 'rgba(78,201,142,0.5)' : SK.amberBorder}`,
            borderRadius:4,cursor:'pointer',
            color:appliedMsg ? SK.green : SK.amber,
            padding:'2px 8px',fontSize:9,fontWeight:700,
            display:'flex',alignItems:'center',gap:3,fontFamily:'inherit',
            boxShadow:SHADOW_RAISED,
          }}>
          {appliedMsg ? <><FiCheck size={9}/> Applied!</> : <><FiZap size={9}/> Apply to HTML</>}
        </button>
      </div>

      {/* ── TABS ── */}
      <div style={{
        display:'flex', flexShrink:0,
        background:'linear-gradient(180deg,#252528 0%,#222224 100%)',
        borderBottom:'1px solid rgba(0,0,0,0.4)',
        boxShadow:'0 1px 0 rgba(255,255,255,0.05)',
      }}>
        {(['presets','controls'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex:1, padding:'6px 0', border:'none', cursor:'pointer',
            background:'none', fontSize:10, fontWeight:700, letterSpacing:'0.07em',
            textTransform:'uppercase', fontFamily:'inherit',
            color:activeTab === tab ? SK.amber : SK.textMuted,
            borderBottom:`2px solid ${activeTab === tab ? SK.amber : 'transparent'}`,
            textShadow:`0 1px 1px rgba(0,0,0,0.5)`,
            transition:'color 0.1s, border-color 0.1s',
          }}>
            {tab === 'presets' ? '⬡ Presets' : '⊞ Controls'}
          </button>
        ))}
      </div>

      {/* ── SCROLLABLE BODY ── */}
      <div style={{flex:1, overflowY:'auto', background:SK.bg}}>

        {/* OGL CODE PANEL */}
        {showCode && (
          <div style={{margin:10,borderRadius:5,background:'rgba(0,0,0,0.4)',border:'1px solid rgba(0,0,0,0.5)',boxShadow:SHADOW_SUNKEN,overflow:'hidden'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 10px',background:'rgba(0,0,0,0.3)',borderBottom:'1px solid rgba(0,0,0,0.4)'}}>
              <span style={{fontSize:9,fontWeight:700,color:SK.textMuted,letterSpacing:'0.08em'}}>OGL.JS EMBED CODE</span>
              <div style={{display:'flex',gap:4}}>
                <SkuBtn onClick={copyCode} active={codeCopied}>
                  {codeCopied ? <FiCheck size={9}/> : <FiCopy size={9}/>}
                  {codeCopied ? 'Copied!' : 'Copy'}
                </SkuBtn>
              </div>
            </div>
            <pre style={{margin:0,padding:'8px 10px',fontFamily:'monospace',fontSize:9,lineHeight:1.6,color:'#88cc88',overflowX:'auto',whiteSpace:'pre-wrap',wordBreak:'break-word',maxHeight:180}}>{getOGLCode()}</pre>
            <div style={{padding:'5px 10px',background:'rgba(0,0,0,0.2)',borderTop:'1px solid rgba(0,0,0,0.3)',fontSize:9,color:SK.textMuted}}>
              💡 Paste before &lt;/body&gt; in your HTML — powered by OGL.js from CDN
            </div>
          </div>
        )}

        {/* PRESETS TAB */}
        {activeTab === 'presets' && (
          <div style={{padding:'10px 10px 0'}}>
            <div style={{fontSize:9,fontWeight:700,color:SK.textMuted,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:8,textShadow:'0 1px 1px rgba(0,0,0,0.5)'}}>
              OGL 3D Effects — {PRESETS.length} Raymarched Scenes
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {PRESETS.map(p => {
                const isActive = p.id === presetId;
                return (
                  <button key={p.id} onClick={() => { setPresetId(p.id); setActiveTab('controls'); }}
                    style={{
                      display:'flex', alignItems:'center', gap:10,
                      padding:'7px 10px', borderRadius:5, cursor:'pointer',
                      border:`1px solid ${isActive ? 'rgba(180,110,20,0.55)' : 'rgba(0,0,0,0.45)'}`,
                      background:isActive ? 'linear-gradient(180deg,rgba(229,164,90,0.15) 0%,rgba(229,164,90,0.08) 100%)' : BTN_RAISED,
                      boxShadow:isActive ? SHADOW_ACTIVE : SHADOW_RAISED,
                      textAlign:'left', fontFamily:'inherit',
                      color:isActive ? SK.amber : SK.text,
                      transition:'all 0.12s',
                    }}>
                    <span style={{fontSize:16,flexShrink:0,lineHeight:1}}>{p.emoji}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:700,marginBottom:1,textShadow:'0 1px 1px rgba(0,0,0,0.5)'}}>{p.label}</div>
                      <div style={{fontSize:9,color:isActive ? SK.amberGlow : SK.textMuted}}>{p.desc}</div>
                    </div>
                    {isActive && (
                      <div style={{width:8,height:8,borderRadius:'50%',background:SK.amber,boxShadow:`0 0 6px ${SK.amberGlow}`,flexShrink:0}}/>
                    )}
                  </button>
                );
              })}
            </div>
            <div style={{height:10}}/>
          </div>
        )}

        {/* CONTROLS TAB */}
        {activeTab === 'controls' && (
          <div style={{padding:'10px'}}>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:700,color:SK.amber,marginBottom:2,textShadow:'0 1px 1px rgba(0,0,0,0.5)'}}>
                {preset.emoji} {preset.label}
              </div>
              <div style={{fontSize:9,color:SK.textMuted,lineHeight:1.5}}>{preset.desc}</div>
            </div>
            <div style={{borderRadius:5,overflow:'hidden',border:'1px solid rgba(0,0,0,0.5)',boxShadow:SHADOW_RAISED}}>
              <div style={{padding:'5px 10px',fontSize:9,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:SK.textMuted,background:'linear-gradient(180deg,rgba(0,0,0,0.3) 0%,rgba(0,0,0,0.2) 100%)',borderBottom:'1px solid rgba(0,0,0,0.35)',textShadow:'0 1px 1px rgba(0,0,0,0.5)',boxShadow:'inset 0 1px 0 rgba(255,255,255,0.05)'}}>
                ⊞ 3D Scene Parameters
              </div>
              <div style={{padding:'10px',background:'rgba(0,0,0,0.12)'}}>
                {preset.params.map(p => renderControl(p))}
              </div>
            </div>
            <div style={{marginTop:8,display:'flex',justifyContent:'flex-end'}}>
              <SkuBtn onClick={resetParams}>
                <FiRefreshCw size={9}/> Reset to Defaults
              </SkuBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OGLShaderEditor;
