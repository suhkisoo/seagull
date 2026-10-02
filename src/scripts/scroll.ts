// 스크롤 진행값 하나로 띠 높이, 막, 빛을 움직인다. docs/plan.md 3.1, 4.2. 브라우저 기본 스크롤 그대로.
import { lights, type Light } from '../content/lights';
import type { WaterState } from './water/index';

function hex(c: string): [number, number, number] { const n = parseInt(c.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }
const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: [number, number, number]) => `rgb(${Math.round(c[0] * 255)} ${Math.round(c[1] * 255)} ${Math.round(c[2] * 255)})`;

export type ScrollHooks = { onProgress?: (p: number) => void };

export function createScroll(root: HTMLElement, water: { state: WaterState; updateBand: () => void; bakeTitle: () => void } | null, hooks: ScrollHooks = {}) {
  const wrapper = root.querySelector<HTMLElement>('.water')!;
  const curtain = root.querySelector<HTMLElement>('.curtain');
  const probe = document.createElement('div'); probe.style.cssText = 'position:fixed;top:0;left:0;height:100svh;width:0;pointer-events:none;visibility:hidden;padding-bottom:env(safe-area-inset-bottom,0px);box-sizing:content-box';
  document.body.appendChild(probe);
  let svh = 0, safe = 0, heroPx = 0, bandPx = 0, duskStart = performance.now();
  const measure = () => { svh = probe.offsetHeight; safe = parseFloat(getComputedStyle(probe).paddingBottom) || 0; svh -= safe; heroPx = 0.38 * svh + safe; bandPx = Math.max(0.15 * svh, 88) + safe; };
  measure();
  let lastY = -1, lastP = -1, vel = 0, lastT = 0, running = true, cssTick = 0;
  const hero = lights.find((l) => l.id === 'hero')!, dusk = lights.find((l) => l.id === 'hero-dusk')!, next = lights.find((l) => l.id === 'tickets')!;
  function lerpLight(a: Light, b: Light, t: number) {
    return { skyTop: mix(hex(a.skyTop), hex(b.skyTop), t), skyBot: mix(hex(a.skyBot), hex(b.skyBot), t), bgTop: mix(hex(a.bgTop), hex(b.bgTop), t), bgBot: mix(hex(a.bgBot), hex(b.bgBot), t), sparkle: mix(hex(a.sparkle), hex(b.sparkle), t), wind: a.wind + (b.wind - a.wind) * t };
  }
  function tick(now: number) {
    if (!running) return;
    requestAnimationFrame(tick);
    const y = window.scrollY;
    const dt = lastT ? Math.min(100, now - lastT) : 16; lastT = now;
    const v = lastY < 0 ? 0 : (y - lastY) / Math.max(dt, 1); lastY = y;
    vel += (v - vel) * 0.15;
    // 막 올리기 구간: 첫 화면 높이의 60%
    const p = Math.max(0, Math.min(1, y / (0.6 * svh)));
    const h = heroPx + (bandPx - heroPx) * p;
    if (p !== lastP) {
      wrapper.style.setProperty('--water-h', `${h.toFixed(1)}px`);
      root.style.setProperty('--curtain', p.toFixed(4));
      if (curtain) { curtain.style.transform = `translate3d(0, ${(-p * 100).toFixed(2)}%, 0) skewX(${(Math.max(-1, Math.min(1, vel)) * 1.5 * (1 - p)).toFixed(2)}deg)`; }
      wrapper.classList.toggle('is-band', p > 0.98);
      wrapper.classList.toggle('is-hero', p < 0.02);
      water?.updateBand();
      hooks.onProgress?.(p);
      lastP = p;
    }
    // 빛. 머물면 90초에 걸쳐 저물고 스크롤이 앞당긴다. 그 뒤는 다음 구간의 빛으로
    const duskT = Math.max(0, Math.min(1, (now - duskStart) / 90000 + p));
    const L1 = lerpLight(hero, dusk, duskT);
    const after = Math.max(0, Math.min(1, (y - 0.6 * svh) / (0.8 * svh)));
    const L = after > 0 ? lerpLight({ ...hero, skyTop: css(L1.skyTop), skyBot: css(L1.skyBot), bgTop: css(L1.bgTop), bgBot: css(L1.bgBot), sparkle: css(L1.sparkle), wind: L1.wind } as unknown as Light, next, after) : L1;
    if (water) { water.state.light.surface = L.skyTop; water.state.light.deep = L.skyBot; water.state.light.sparkle = L.sparkle; water.state.light.wind = L.wind; water.state.lightDir = [0, -0.4 + 0.3 * duskT]; }
    if (now - cssTick > 100) { cssTick = now; root.style.setProperty('--bg-top', css(L.bgTop)); root.style.setProperty('--bg-bot', css(L.bgBot)); root.style.setProperty('--sky-top', css(L.skyTop)); root.style.setProperty('--sky-bot', css(L.skyBot)); root.style.setProperty('--dusk', (0.25 + 0.55 * duskT).toFixed(3)); }
  }
  requestAnimationFrame(tick);
  const onResize = () => { measure(); lastP = -1; water?.bakeTitle(); };
  window.addEventListener('resize', onResize);
  // 색 함수 hex→css 문자열 변환을 다시 hex로 받는 간이 처리
  return { stop: () => { running = false; } };
}
