/* Original fragment shader from the user's purchased Shader Lines component (Ali Imam).
 * The fragment source is preserved verbatim, including its original RGB output.
 * Native WebGL hosts it without adding React or a second, legacy Three.js runtime.
 */
(() => {
  'use strict';
  const backdrop = document.getElementById('shader-backdrop');
  const canvas = document.getElementById('shader-lines');
  if (!backdrop || !canvas) return;

  const vertexSource = `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `;
  const fragmentSource = `
      #define TWO_PI 6.2831853072
      #define PI 3.14159265359

      precision highp float;
      uniform vec2 resolution;
      uniform float time;
        
      float random (in float x) {
          return fract(sin(x)*1e4);
      }
      float random (vec2 st) {
          return fract(sin(dot(st.xy,
                               vec2(12.9898,78.233)))*
              43758.5453123);
      }
      
      varying vec2 vUv;

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        
        vec2 fMosaicScal = vec2(4.0, 2.0);
        vec2 vScreenSize = vec2(256,256);
        uv.x = floor(uv.x * vScreenSize.x / fMosaicScal.x) / (vScreenSize.x / fMosaicScal.x);
        uv.y = floor(uv.y * vScreenSize.y / fMosaicScal.y) / (vScreenSize.y / fMosaicScal.y);       
          
        float t = time*0.06+random(uv.x)*0.4;
        float lineWidth = 0.0008;

        vec3 color = vec3(0.0);
        for(int j = 0; j < 3; j++){
          for(int i=0; i < 5; i++){
            color[j] += lineWidth*float(i*i) / abs(fract(t - 0.01*float(j)+float(i)*0.01)*1.0 - length(uv));        
          }
        }

        gl_FragColor = vec4(color[2],color[1],color[0],1.0);
      }
    `;

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  const listen = (target, type, handler) => target.addEventListener(type, handler, { signal: listeners.signal });
  let gl;
  let program;
  let buffer;
  let uniforms;
  let frameId = 0;
  let lastTick = null;
  let time = 1.05;
  let frameInterval = 1000 / 60;
  let lost = false;
  let disposed = false;
  let pageHidden = false;
  let manualPause = document.body.classList.contains('motion-paused');
  let dialogOpen = !!document.querySelector('dialog[open]');

  function stop() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0; lastTick = null;
  }
  function canAnimate() {
    return !!program && !lost && !disposed && !pageHidden && !document.hidden
      && !motionPreference.matches && !manualPause && !dialogOpen;
  }
  function draw() {
    if (!program || lost || disposed) return;
    gl.uniform1f(uniforms.time, time);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function tick(timestamp) {
    frameId = 0;
    if (!canAnimate()) { lastTick = null; return; }
    if (lastTick === null) lastTick = timestamp;
    const elapsed = timestamp - lastTick;
    if (elapsed >= frameInterval - 0.5) {
      // Match the supplied .05-per-frame speed at 60 Hz, independently of refresh rate.
      time += Math.min(elapsed / 1000, 0.1) * 3;
      lastTick = timestamp;
      draw();
    }
    frameId = requestAnimationFrame(tick);
  }
  function syncMotion() {
    stop();
    if (canAnimate()) frameId = requestAnimationFrame(tick);
  }
  function resize() {
    if (!program || lost || disposed) return;
    const rect = backdrop.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    frameInterval = 1000 / (width <= 700 ? 30 : 60);
    const budget = width <= 700 ? 650000 : 1250000;
    const limit = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    const scale = Math.min(window.devicePixelRatio || 1, 1.25,
      Math.sqrt(budget / (width * height)), limit / width, limit / height);
    const nextWidth = Math.max(1, Math.floor(width * scale));
    const nextHeight = Math.max(1, Math.floor(height * scale));
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth; canvas.height = nextHeight;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    draw();
  }
  function compile(type, source) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Shader allocation failed');
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader); throw new Error('Shader compilation failed');
    }
    return shader;
  }
  function release() {
    if (!gl || gl.isContextLost()) return;
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    buffer = null; program = null;
  }
  function initialize() {
    stop();
    let vertex;
    let fragment;
    try {
      gl ||= canvas.getContext('webgl', {
        alpha: false, antialias: false, depth: false, stencil: false,
        powerPreference: 'low-power', preserveDrawingBuffer: false
      });
      if (!gl) return;
      lost = false;
      vertex = compile(gl.VERTEX_SHADER, vertexSource);
      fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
      program = gl.createProgram();
      if (!program) throw new Error('Program allocation failed');
      gl.attachShader(program, vertex); gl.attachShader(program, fragment);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader linking failed');
      gl.useProgram(program);
      buffer = gl.createBuffer();
      if (!buffer) throw new Error('Buffer allocation failed');
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      uniforms = { time: gl.getUniformLocation(program, 'time'), resolution: gl.getUniformLocation(program, 'resolution') };
      resize();
      document.body.classList.add('shader-ready');
      syncMotion();
    } catch {
      stop(); release(); document.body.classList.remove('shader-ready');
    } finally {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
    }
  }
  listen(canvas, 'webglcontextlost', event => {
    event.preventDefault(); lost = true; stop();
    program = null; buffer = null;
    document.body.classList.remove('shader-ready');
  });
  listen(canvas, 'webglcontextrestored', () => { if (!disposed) initialize(); });
  listen(document, 'steeltown:motion', event => { manualPause = !!event.detail.paused; syncMotion(); });
  listen(document, 'visibilitychange', syncMotion);
  listen(motionPreference, 'change', syncMotion);
  listen(window, 'resize', resize);
  const sizeObserver = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  sizeObserver?.observe(backdrop);
  const dialogObserver = new MutationObserver(() => {
    const next = !!document.querySelector('dialog[open]');
    if (next !== dialogOpen) { dialogOpen = next; syncMotion(); }
  });
  dialogObserver.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
  listen(window, 'pagehide', event => {
    pageHidden = true; stop();
    if (event.persisted) return;
    disposed = true; release(); listeners.abort();
    sizeObserver?.disconnect(); dialogObserver.disconnect();
  });
  listen(window, 'pageshow', () => { pageHidden = false; resize(); syncMotion(); });
  initialize();
})();
