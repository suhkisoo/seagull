// 수면 모듈. docs/plan.md 4장. 캔버스 한 장, WebGL1 코어만, 상태는 전부 JS에 있다.
import { VERT, frag } from './shader';

type Tier = 0 | 1 | 2 | 3;
const TIERS: Record<Tier, { dpr: number; n: number; spec: boolean; amb: number; sharp: boolean; half: boolean }> = {
  3: { dpr: 1.5, n: 8, spec: true, amb: 3, sharp: true, half: false },
  2: { dpr: 1.25, n: 6, spec: true, amb: 2, sharp: true, half: false },
  1: { dpr: 1.0, n: 4, spec: false, amb: 2, sharp: false, half: false },
  0: { dpr: 0.75, n: 3, spec: false, amb: 1, sharp: false, half: true },
};
const TAU = 1.6, V = 140, LIFE = 4.5;

export type WaterOptions = {
  wrapper: HTMLElement;     // .water (고정 래퍼)
  canvas: HTMLCanvasElement;
  title: HTMLElement;       // 비칠 제목
  button: HTMLElement;      // 예매 버튼
  baseImage?: HTMLImageElement | null; // 바탕 텍스처(그림의 반영). 없으면 색만
};

export type WaterState = {
  light: { surface: [number, number, number]; deep: [number, number, number]; sparkle: [number, number, number]; wind: number };
  video: [number, number, number, number];
  lamp: [number, number, number, number];   // 고른 회차의 불빛(캔버스 좌표 x, y, 반지름, 세기)
  baseMix: number;                          // 바탕 텍스처(그림의 반영) 섞기 0~1. 스크롤 모듈이 막의 진행으로 정한다
  baseRect: [number, number, number];       // 그림의 left, width, 반영 높이(CSS px)
  lightDir: [number, number];
  sparkleDir: [number, number];
};

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
const q = new URLSearchParams(location.search);
const qnum = (k: string) => (q.has(k) ? Number(q.get(k)) : null);

export function createWater(opts: WaterOptions) {
  const { wrapper, canvas, title, button } = opts;
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: q.has('t'), powerPreference: 'low-power' }) as WebGLRenderingContext | null;
  if (!gl) return null;
  const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  if (!hp || hp.precision === 0) return null;
  const maxUniformVec = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) as number;

  // ----- 상태 -----
  const fixedQ = q.get('quality');
  let tier: Tier = (fixedQ !== null && /^[0-3]$/.test(fixedQ)) ? (Number(fixedQ) as Tier) : 3;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (fixedQ === null && ((nav.deviceMemory ?? 8) <= 3 || navigator.hardwareConcurrency <= 4 || nav.connection?.saveData)) tier = 2;
  const startTier = tier;
  const ripples: { x: number; y: number; t0: number; amp: number; trail: boolean }[] = [];
  let clock = 0, lastFrame = 0, lastInput = 0, calm = 0, calmTarget = 0, wind = 0;
  let waterTop = 0, cssW = 0, cssH = 0, scale = 1, drawH = 0;
  let base = 16.67, baseProvisional = false, baseRemeasuredAt = 0;
  const fixedT = qnum('t');
  const fixedCalm = qnum('calm');
  const fixedWind = qnum('wind');
  const refract = qnum('refract') ?? 4;
  const baseMixOpt = qnum('reflection') ?? 0.9; // P15. 기본으로 그림의 반영을 쓴다. ?reflection=0 이면 색만
  let lossCount = 0, lossTimes: number[] = [], lost = false, raf = 0, running = false, frameCount = 0;
  const samples: number[] = []; let slowWindows = 0, goodWindows = 0, lastChange = 0, debugEl: HTMLElement | null = null;
  const state: WaterState = { light: { surface: hex('#5B6041'), deep: hex('#262E27'), sparkle: hex('#ABAB76'), wind: 0.15 }, video: [0, 0, 0, 0], lamp: [0, 0, 1, 0], baseMix: 1, baseRect: [0, 1, 1], lightDir: [0, -0.4], sparkleDir: [0, 0] };

  // ----- GL 객체 -----
  let prog: WebGLProgram | null = null, progTier: Tier | -1 = -1;
  let buf: WebGLBuffer | null = null, titleTex: WebGLTexture | null = null, baseTex: WebGLTexture | null = null;
  const U: Record<string, WebGLUniformLocation | null> = {};
  const uniformNames = ['u_size', 'u_ripple', 'u_params', 'u_gains', 'u_light', 'u_glow', 'u_titleRect', 'u_video', 'u_colSurface', 'u_colDeep', 'u_colSparkle', 'u_title', 'u_base', 'u_baseMix', 'u_titleOn', 'u_refract', 'u_lamp', 'u_baseRect'];
  const rippleBuf = new Float32Array(8 * 4);
  let titleRect = [0, 0, 1, 1], titleReady = false, bakedScroll = 0;

  function compile(type: number, src: string) {
    const sh = gl!.createShader(type)!; gl!.shaderSource(sh, src); gl!.compileShader(sh);
    if (!gl!.getShaderParameter(sh, gl!.COMPILE_STATUS)) throw new Error('shader: ' + gl!.getShaderInfoLog(sh));
    return sh;
  }
  function buildProgram(t: Tier) {
    const c = TIERS[t];
    const n = maxUniformVec < 32 ? Math.min(c.n, 4) : c.n;
    const p = gl!.createProgram()!;
    gl!.attachShader(p, compile(gl!.VERTEX_SHADER, VERT));
    gl!.attachShader(p, compile(gl!.FRAGMENT_SHADER, frag(n, c.spec, c.amb, c.sharp)));
    gl!.bindAttribLocation(p, 0, 'a');
    gl!.linkProgram(p);
    if (!gl!.getProgramParameter(p, gl!.LINK_STATUS)) throw new Error('link: ' + gl!.getProgramInfoLog(p));
    return p;
  }
  function useTier(t: Tier) {
    if (progTier === t && prog) return;
    prog = buildProgram(t); progTier = t;
    gl!.useProgram(prog);
    for (const nme of uniformNames) U[nme] = gl!.getUniformLocation(prog, nme);
    gl!.uniform1i(U.u_title, 0); gl!.uniform1i(U.u_base, 1);
    gl!.enableVertexAttribArray(0);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, buf);
    gl!.vertexAttribPointer(0, 2, gl!.FLOAT, false, 0, 0);
  }
  function initGL() {
    buf = gl!.createBuffer();
    gl!.bindBuffer(gl!.ARRAY_BUFFER, buf);
    gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl!.STATIC_DRAW);
    titleTex = gl!.createTexture();
    gl!.activeTexture(gl!.TEXTURE0); gl!.bindTexture(gl!.TEXTURE_2D, titleTex);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, 2, 2, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, new Uint8Array(16));
    baseTex = gl!.createTexture();
    gl!.activeTexture(gl!.TEXTURE1); gl!.bindTexture(gl!.TEXTURE_2D, baseTex);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    if (opts.baseImage && opts.baseImage.complete && opts.baseImage.naturalWidth) {
      gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, 0);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGB, gl!.RGB, gl!.UNSIGNED_BYTE, opts.baseImage);
    } else gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGB, 2, 2, 0, gl!.RGB, gl!.UNSIGNED_BYTE, new Uint8Array(12));
    progTier = -1; useTier(tier);
    gl!.enable(gl!.SCISSOR_TEST);
  }

  // ----- 크기 -----
  function resize() {
    const r = canvas.getBoundingClientRect();
    cssW = r.width; cssH = r.height;
    scale = Math.min(window.devicePixelRatio || 1, TIERS[tier].dpr);
    const w = Math.max(1, Math.round(cssW * scale)), h = Math.max(1, Math.round(cssH * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl!.viewport(0, 0, w, h);
    updateBand();
    bakeTitle();
  }
  function updateBand() {
    // 래퍼 높이가 띠. 캔버스는 래퍼 바닥에 붙어 있으므로 수평선은 캔버스 위에서 (cssH - 띠)
    const band = wrapper.getBoundingClientRect().height;
    waterTop = Math.max(0, cssH - band);
    drawH = Math.round((cssH - waterTop) * scale);
    gl!.scissor(0, 0, canvas.width, Math.min(canvas.height, drawH));
  }

  // ----- 제목 텍스처 -----
  function bakeTitle() {
    const cr = canvas.getBoundingClientRect();
    const tr = title.getBoundingClientRect();
    if (!tr.width || !tr.height) { titleReady = false; return; }
    const pad = 4;
    const W = Math.ceil(tr.width + pad * 2), H = Math.ceil(tr.height + pad * 2 + 24);
    const s = Math.min(2, scale * 1.5);
    const c1 = document.createElement('canvas'); c1.width = Math.ceil(W * s); c1.height = Math.ceil(H * s);
    const ctx = c1.getContext('2d')!; ctx.scale(s, s);
    const cs = getComputedStyle(title);
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic';
    // 글자마다 Range로 상자를 재어 같은 자리에 찍는다. 세로쓰기도 그대로 따라간다
    const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent || '';
      for (let i = 0; i < text.length; i++) {
        if (!text[i].trim()) continue;
        const rg = document.createRange(); rg.setStart(node, i); rg.setEnd(node, i + 1);
        const b = rg.getBoundingClientRect();
        if (!b.width) continue;
        const fs = parseFloat(cs.fontSize);
        ctx.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
        const m = ctx.measureText(text[i]);
        const x = b.left - tr.left + pad + (b.width - m.width) / 2;
        const y = b.top - tr.top + pad + (b.height + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent)) / 2;
        ctx.fillText(text[i], x, y);
      }
    }
    // 세로로 번진 사본(G)과 선명한 사본(R)을 한 장에 넣는다
    const c2 = document.createElement('canvas'); c2.width = c1.width; c2.height = c1.height;
    const c2x = c2.getContext('2d')!;
    for (let k = 0; k < 12; k++) { c2x.globalAlpha = 0.22 * (1 - k / 12); c2x.drawImage(c1, 0, k * 2.5 * s); }
    const id1 = ctx.getImageData(0, 0, c1.width, c1.height).data;
    const id2 = c2x.getImageData(0, 0, c2.width, c2.height).data;
    const out = new Uint8Array(c1.width * c1.height * 4);
    for (let i = 0; i < out.length; i += 4) { out[i] = id1[i + 3]; out[i + 1] = id2[i + 3]; out[i + 2] = 0; out[i + 3] = 255; }
    gl!.activeTexture(gl!.TEXTURE0); gl!.bindTexture(gl!.TEXTURE_2D, titleTex);
    gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, 0);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, c1.width, c1.height, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, out);
    // 캔버스 좌표의 제목 상자(수평선 위라 y가 음수). 반사는 세로로 1.2배 늘린다
    titleRect = [tr.left - cr.left - pad, (tr.top - cr.top - pad), W, H]; bakedScroll = window.scrollY;
    titleReady = true;
  }
  function glowRect() {
    const cr = canvas.getBoundingClientRect(), br = button.getBoundingClientRect();
    return [br.left - cr.left + br.width / 2, br.top - cr.top + br.height, Math.min(Math.max(br.width / 3, 24), 48)];
  }

  // ----- 입력 -----
  function toCanvas(x: number, y: number) { const cr = canvas.getBoundingClientRect(); return [x - cr.left, y - cr.top]; }
  function drop(x: number, y: number, amp = 6, trail = false, t0 = clock) {
    const above = Math.max(0, waterTop - y);
    const yy = Math.max(y, waterTop - 120);
    const a = above > 0 ? amp * Math.max(0.35, 1 - above / 900) : amp;
    const last = ripples[ripples.length - 1];
    if (last && !trail && Math.hypot(last.x - x, last.y - yy) < 16 && clock - last.t0 < 0.1) { last.amp = Math.min(last.amp + a * 0.5, 10); return; }
    const tr = ripples.filter((r) => r.trail), tp = ripples.filter((r) => !r.trail);
    const c = TIERS[tier]; const maxTrail = Math.max(1, Math.round(c.n * 3 / 8)), maxTap = c.n - maxTrail;
    if (trail) { while (tr.length >= maxTrail) { const i = ripples.indexOf(tr.shift()!); ripples.splice(i, 1); } }
    else { while (tp.length >= maxTap) { const i = ripples.indexOf(tp.shift()!); ripples.splice(i, 1); } }
    ripples.push({ x, y: yy, t0, amp: a, trail });
    touched();
  }
  function touched() { lastInput = clock; calmTarget = 0; }
  let lastMove = 0, lastMx = 0, lastMy = 0;
  const hoverFine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  window.addEventListener('pointerdown', (e) => { const [x, y] = toCanvas(e.clientX, e.clientY); drop(x, y, 4.5); }, { passive: true });
  window.addEventListener('pointermove', (e) => {
    if (!hoverFine || e.pointerType !== 'mouse') return;
    const [x, y] = toCanvas(e.clientX, e.clientY);
    const now = performance.now();
    if (y < waterTop) { lastMx = x; lastMy = y; return; }
    if (now - lastMove > 90 || Math.hypot(x - lastMx, y - lastMy) > 24) { lastMove = now; lastMx = x; lastMy = y; drop(x, y, 2, true); }
    state.sparkleDir = [(e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2];
  }, { passive: true });
  for (const ev of ['scroll', 'keydown', 'wheel']) window.addEventListener(ev, () => { touched(); }, { passive: true });

  // ----- 조정기 -----
  function median(a: number[]) { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; }
  function iqr(a: number[]) { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length * 0.75)] - s[Math.floor(s.length * 0.25)]; }
  function measureBase(frames: number, cb: (b: number) => void) {
    const ts: number[] = [];
    const step = (t: number) => { ts.push(t); if (ts.length <= frames) requestAnimationFrame(step); else { const d = ts.slice(1).map((v, i) => v - ts[i]).filter((v) => v < 250); const m = median(d); cb([8.33, 16.67, 33.33].reduce((p, c) => Math.abs(c - m) < Math.abs(p - m) ? c : p)); } };
    requestAnimationFrame(step);
  }
  function govern(dt: number) {
    if (fixedQ !== null || fixedT !== null) return;
    if (dt > 250) { samples.length = 0; return; }
    if (frameCount < 30) return;
    samples.push(dt);
    if (samples.length < 60) return;
    const med = median(samples), q = iqr(samples); samples.length = 0;
    const locked30 = base === 33.33 && !baseProvisional && med >= 31 && med <= 36 && q < 3;
    if (!locked30 && med > Math.max(1.5 * base, 18)) { slowWindows++; goodWindows = 0; } else { slowWindows = 0; if (med < Math.max(1.1 * base, 17) || locked30) goodWindows++; else goodWindows = 0; }
    if (slowWindows >= 2 && clock - lastChange > 3) {
      slowWindows = 0; lastChange = clock;
      if (tier > 0) { tier = (tier - 1) as Tier; useTier(tier); resize(); } else { stopStill('slow'); }
    } else if (goodWindows >= 10 && tier < startTier && clock - lastChange > 30) { goodWindows = 0; lastChange = clock; tier = (tier + 1) as Tier; useTier(tier); resize(); }
  }

  // ----- 프레임 -----
  function frame(now: number) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = lastFrame ? now - lastFrame : 16.7; lastFrame = now;
    frameCount++;
    if (fixedT === null) clock += Math.min(dt, 100) / 1000; else clock = fixedT;
    govern(dt);
    if (TIERS[tier].half && (frameCount & 1)) return;
    // 멈춤
    const idle = clock - lastInput;
    calmTarget = (idle > 2.5 && state.video[3] < 0.01) ? 1 : 0;
    const tc = calmTarget ? 1.2 : 0.25;
    calm += (calmTarget - calm) * (1 - Math.exp(-(Math.min(dt, 100) / 1000) / tc));
    if (fixedCalm !== null) calm = fixedCalm;
    const windT = fixedWind ?? state.light.wind;
    wind += (windT - wind) * (1 - Math.exp(-(Math.min(dt, 100) / 1000) / 2));
    const amb = (0.12 + 0.6 * wind) * (1 - 0.85 * calm);
    wrapper.style.setProperty('--calm', calm.toFixed(3));
    if (calm > 0.85 && !wrapper.classList.contains('is-calm')) wrapper.classList.add('is-calm');
    else if (calm < 0.5 && wrapper.classList.contains('is-calm')) wrapper.classList.remove('is-calm');
    // 절전: 잔잔하고 물결이 없고 바람이 작으면 둘 중 하나
    const live = ripples.filter((r) => clock - r.t0 >= 0 && clock - r.t0 < LIFE);
    if (calm > 0.98 && live.length === 0 && wind < 0.05 && (frameCount & 1)) return;
    for (let i = ripples.length - 1; i >= 0; i--) if (clock - ripples[i].t0 >= LIFE) ripples.splice(i, 1);
    const n = Math.min(live.length, TIERS[tier].n);
    rippleBuf.fill(0);
    for (let i = 0; i < n; i++) { const r = live[live.length - n + i]; const age = Math.max(0, clock - r.t0); rippleBuf.set([r.x, r.y, V * age, r.amp * Math.exp(-age / TAU)], i * 4); }
    gl!.uniform4fv(U.u_ripple, rippleBuf.subarray(0, Math.max(n, 1) * 4));
    gl!.uniform2f(U.u_size, cssW, cssH);
    gl!.uniform4f(U.u_params, cssH, scale, waterTop, n);
    gl!.uniform4f(U.u_gains, amb, TIERS[tier].spec ? 1 : 0, calm, clock % 60);
    gl!.uniform4f(U.u_light, state.lightDir[0], state.lightDir[1], state.sparkleDir[0], state.sparkleDir[1]);
    const g = glowRect();
    gl!.uniform4f(U.u_glow, g[0], g[1], g[2], button.getAttribute('aria-disabled') === 'true' ? 0.18 : 0.42);
    // 제목은 스크롤과 함께 올라간다. 구운 자리에서 스크롤 차이만큼 옮긴다
    const ty = titleRect[1] - (window.scrollY - bakedScroll);
    gl!.uniform4f(U.u_titleRect, titleRect[0], ty, titleRect[2], titleRect[3] * 1.2);
    gl!.uniform1f(U.u_titleOn, titleReady && ty + titleRect[3] > -600 ? 1 : 0);
    gl!.uniform4f(U.u_video, state.video[0], state.video[1], state.video[2], state.video[3]);
    gl!.uniform3fv(U.u_colSurface, state.light.surface); gl!.uniform3fv(U.u_colDeep, state.light.deep); gl!.uniform3fv(U.u_colSparkle, state.light.sparkle);
    gl!.uniform1f(U.u_baseMix, opts.baseImage ? baseMixOpt * state.baseMix : 0);
    gl!.uniform3f(U.u_baseRect, state.baseRect[0], state.baseRect[1], state.baseRect[2]);
    gl!.uniform4f(U.u_lamp, state.lamp[0], state.lamp[1], state.lamp[2], state.lamp[3]);
    gl!.uniform1f(U.u_refract, refract);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    if (debugEl && (frameCount % 30) === 0) {
      const s = samples.length ? median(samples).toFixed(1) : '-';
      debugEl.textContent = `tier ${tier} dpr ${scale.toFixed(2)} ${canvas.width}×${canvas.height} draw ${drawH} base ${base} med ${s} ripples ${live.length} calm ${calm.toFixed(2)} ${(gl!.getExtension('WEBGL_debug_renderer_info') ? gl!.getParameter(gl!.getExtension('WEBGL_debug_renderer_info')!.UNMASKED_RENDERER_WEBGL) : '')}`;
    }
    if (fixedT !== null && frameCount > 2) { running = false; cancelAnimationFrame(raf); }
  }

  // ----- 생명 주기 -----
  function start() {
    if (running) return; running = true; lastFrame = 0; frameCount = 0; samples.length = 0; raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function stopStill(reason: string) { stop(); wrapper.dataset.water = 'still'; canvas.style.opacity = '0'; wrapper.dataset.waterReason = reason; }

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault(); lost = true; stop(); canvas.style.opacity = '0'; lossCount++; lossTimes.push(performance.now());
    lossTimes = lossTimes.filter((t) => performance.now() - t < 60000);
    if (lossCount >= 3 || lossTimes.length >= 2) stopStill('context-lost');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    if (wrapper.dataset.water === 'still') return;
    lost = false; initGL(); resize(); start(); canvas.style.opacity = '1';
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (wrapper.dataset.water !== 'still') { if (gl!.isContextLost()) return; measureBase(20, (b) => { base = b; baseProvisional = b === 33.33; start(); }); }
  });
  let resizeT = 0;
  const onResize = () => { clearTimeout(resizeT); resizeT = window.setTimeout(() => { resize(); }, 200); };
  window.addEventListener('resize', onResize); window.visualViewport?.addEventListener('resize', onResize);
  (document as Document & { fonts?: FontFaceSet }).fonts?.addEventListener?.('loadingdone', () => bakeTitle());

  // 시작: 캔버스를 만들기 전 빈 rAF로 기준 간격을 잰 뒤 초기화
  measureBase(30, (b) => {
    base = b; baseProvisional = b === 33.33;
    initGL(); resize();
    if (q.get('debug') === '1') { debugEl = document.createElement('pre'); debugEl.className = 'water-debug'; wrapper.appendChild(debugEl); }
    // 심은 물결
    const rp = q.get('ripples');
    if (rp) for (const part of rp.split(';')) { const [x, y, t0, amp] = part.split(',').map(Number); ripples.push({ x: x * cssW, y: waterTop + y * (cssH - waterTop), t0: (t0 || 0) / 1000, amp: amp || 6, trail: false }); }
    wrapper.dataset.water = 'live';
    start();
    requestAnimationFrame(() => { canvas.style.opacity = '1'; });
    if (baseProvisional) setTimeout(() => measureBase(30, (b2) => { if (b2 !== 33.33) { base = b2; samples.length = 0; } baseProvisional = false; }), 10000);
  });

  const api = {
    state, drop: (x: number, y: number, amp = 6) => drop(x, y, amp),
    setTime: (ms: number) => { clock = ms / 1000; },
    render: () => frame(performance.now()),
    updateBand, bakeTitle, resize,
    get tier() { return tier; }, get base() { return base; }, get samples() { return samples; },
  };
  (window as unknown as { __water: typeof api }).__water = api;
  return api;
}
