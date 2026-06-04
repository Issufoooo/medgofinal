import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

const hexToRgb = hex => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
};

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;
#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);float n=mix(mix(dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);return 0.5+0.5*n;}
void mainImage(out vec4 o, vec2 C){
  float t=iTime*uTimeSpeed;
  vec2 uv=C/iResolution.xy;
  float ratio=iResolution.x/iResolution.y;
  vec2 tuv=uv-0.5+uCenterOffset;
  tuv/=max(uZoom,0.001);
  float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);
  tuv.y*=1.0/ratio;
  tuv*=Rot(radians((degree-0.5)*uRotationAmount+180.0));
  tuv.y*=ratio;
  float frequency=uWarpFrequency;
  float ws=max(uWarpStrength,0.001);
  float amplitude=uWarpAmplitude/ws;
  float warpTime=t*uWarpSpeed;
  tuv.x+=sin(tuv.y*frequency+warpTime)/amplitude;
  tuv.y+=sin(tuv.x*(frequency*1.5)+warpTime)/(amplitude*0.5);
  vec3 colLav=uColor1;
  vec3 colOrg=uColor2;
  vec3 colDark=uColor3;
  float b=uColorBalance;
  float s=max(uBlendSoftness,0.0);
  mat2 blendRot=Rot(radians(uBlendAngle));
  float blendX=(tuv*blendRot).x;
  float edge0=-0.3-b-s;
  float edge1=0.2-b+s;
  float v0=0.5-b+s;
  float v1=-0.3-b-s;
  vec3 layer1=mix(colDark,colOrg,S(edge0,edge1,blendX));
  vec3 layer2=mix(colOrg,colLav,S(edge0,edge1,blendX));
  vec3 col=mix(layer1,layer2,S(v0,v1,tuv.y));
  vec2 grainUv=uv*max(uGrainScale,0.001);
  if(uGrainAnimated>0.5){grainUv+=vec2(iTime*0.05);}
  float grain=fract(sin(dot(grainUv,vec2(12.9898,78.233)))*43758.5453);
  col+=(grain-0.5)*uGrainAmount;
  col=(col-0.5)*uContrast+0.5;
  float luma=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(luma),col,uSaturation);
  col=pow(max(col,0.0),vec3(1.0/max(uGamma,0.001)));
  col=clamp(col,0.0,1.0);
  o=vec4(col,1.0);
}
void main(){
  vec4 o=vec4(0.0);
  mainImage(o,gl_FragCoord.xy);
  fragColor=o;
}
`;

const ctxMap = new WeakMap();

export function Grainient({
  timeSpeed = 0.18,
  colorBalance = 0.05,
  warpStrength = 0.9,
  warpFrequency = 3.5,
  warpSpeed = 1.2,
  warpAmplitude = 65.0,
  blendAngle = -15.0,
  blendSoftness = 0.1,
  rotationAmount = 280.0,
  noiseScale = 1.5,
  grainAmount = 0.07,
  grainScale = 1.8,
  grainAnimated = false,
  contrast = 1.35,
  gamma = 1.0,
  saturation = 1.15,
  centerX = 0.0,
  centerY = 0.1,
  zoom = 1.0,
  // MedGo palette: teal-light / orange-accent / deep-navy
  color1 = '#14b8a6',
  color2 = '#f97316',
  color3 = '#020617',
  className = '',
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer;
    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: false,
        antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, 1.5),
      });
    } catch {
      return; // WebGL2 not supported — CSS fallback shows
    }

    const gl = renderer.gl;
    const canvas = gl.canvas;
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    container.appendChild(canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iTime:           { value: 0 },
        iResolution:     { value: new Float32Array([1, 1]) },
        uTimeSpeed:      { value: timeSpeed },
        uColorBalance:   { value: colorBalance },
        uWarpStrength:   { value: warpStrength },
        uWarpFrequency:  { value: warpFrequency },
        uWarpSpeed:      { value: warpSpeed },
        uWarpAmplitude:  { value: warpAmplitude },
        uBlendAngle:     { value: blendAngle },
        uBlendSoftness:  { value: blendSoftness },
        uRotationAmount: { value: rotationAmount },
        uNoiseScale:     { value: noiseScale },
        uGrainAmount:    { value: grainAmount },
        uGrainScale:     { value: grainScale },
        uGrainAnimated:  { value: 0.0 },
        uContrast:       { value: contrast },
        uGamma:          { value: gamma },
        uSaturation:     { value: saturation },
        uCenterOffset:   { value: new Float32Array([centerX, centerY]) },
        uZoom:           { value: zoom },
        uColor1:         { value: new Float32Array(hexToRgb(color1)) },
        uColor2:         { value: new Float32Array(hexToRgb(color2)) },
        uColor3:         { value: new Float32Array(hexToRgb(color3)) },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    ctxMap.set(container, { renderer, program, mesh });

    const setSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      renderer.setSize(w, h);
      program.uniforms.iResolution.value[0] = gl.drawingBufferWidth;
      program.uniforms.iResolution.value[1] = gl.drawingBufferHeight;
    };

    const ro = new ResizeObserver(setSize);
    ro.observe(container);
    setSize();

    let raf = 0;
    let isVisible = true;
    let isPageVisible = !document.hidden;
    const t0 = performance.now();

    const loop = t => {
      program.uniforms.iTime.value = (t - t0) * 0.001;
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };

    const tryStart = () => { if (isVisible && isPageVisible && raf === 0) raf = requestAnimationFrame(loop); };
    const tryStop  = () => { if (raf !== 0) { cancelAnimationFrame(raf); raf = 0; } };

    const io = new IntersectionObserver(
      ([e]) => { isVisible = e.isIntersecting; isVisible ? tryStart() : tryStop(); },
      { threshold: 0 }
    );
    io.observe(container);

    const onVis = () => { isPageVisible = !document.hidden; isPageVisible ? tryStart() : tryStop(); };
    document.addEventListener('visibilitychange', onVis);
    tryStart();

    return () => {
      tryStop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      ctxMap.delete(container);
      try { container.removeChild(canvas); } catch { /* ignore */ }
    };
  }, []);

  // Sync prop changes to uniforms without rebuilding WebGL context
  useEffect(() => {
    const ctx = ctxMap.get(containerRef.current);
    if (!ctx) return;
    const u = ctx.program.uniforms;
    u.uTimeSpeed.value      = timeSpeed;
    u.uColorBalance.value   = colorBalance;
    u.uWarpStrength.value   = warpStrength;
    u.uWarpFrequency.value  = warpFrequency;
    u.uWarpSpeed.value      = warpSpeed;
    u.uWarpAmplitude.value  = warpAmplitude;
    u.uBlendAngle.value     = blendAngle;
    u.uBlendSoftness.value  = blendSoftness;
    u.uRotationAmount.value = rotationAmount;
    u.uNoiseScale.value     = noiseScale;
    u.uGrainAmount.value    = grainAmount;
    u.uGrainScale.value     = grainScale;
    u.uGrainAnimated.value  = grainAnimated ? 1.0 : 0.0;
    u.uContrast.value       = contrast;
    u.uGamma.value          = gamma;
    u.uSaturation.value     = saturation;
    u.uCenterOffset.value   = new Float32Array([centerX, centerY]);
    u.uZoom.value           = zoom;
    u.uColor1.value         = new Float32Array(hexToRgb(color1));
    u.uColor2.value         = new Float32Array(hexToRgb(color2));
    u.uColor3.value         = new Float32Array(hexToRgb(color3));
  }, [timeSpeed, colorBalance, warpStrength, warpFrequency, warpSpeed, warpAmplitude,
      blendAngle, blendSoftness, rotationAmount, noiseScale, grainAmount, grainScale,
      grainAnimated, contrast, gamma, saturation, centerX, centerY, zoom, color1, color2, color3]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
}
