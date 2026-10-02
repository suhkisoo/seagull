// 스크롤 진행값 하나로 띠 높이, 막, 빛을 움직인다. docs/plan.md 3.1, 3.3, 4.2. 브라우저 기본 스크롤 그대로.
// 구간의 바탕 빛은 CSS(sections.css)에 고정이고, 여기서는 첫 화면의 저물기와 띠(수면)의 빛만 계산한다.
import { lights, type Light } from '../content/lights';
import type { WaterState } from './water/index';

type RGB = [number, number, number];
function hex(c: string): RGB { const n = parseInt(c.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB) => `rgb(${Math.round(c[0] * 255)} ${Math.round(c[1] * 255)} ${Math.round(c[2] * 255)})`;
type L = { skyTop: RGB; skyBot: RGB; bgTop: RGB; bgBot: RGB; sparkle: RGB; wind: number };
const toL = (l: Light): L => ({ skyTop: hex(l.skyTop), skyBot: hex(l.skyBot), bgTop: hex(l.bgTop), bgBot: hex(l.bgBot), sparkle: hex(l.sparkle), wind: l.wind });
const lerpL = (a: L, b: L, t: number): L => ({ skyTop: mix(a.skyTop, b.skyTop, t), skyBot: mix(a.skyBot, b.skyBot, t), bgTop: mix(a.bgTop, b.bgTop, t), bgBot: mix(a.bgBot, b.bgBot, t), sparkle: mix(a.sparkle, b.sparkle, t), wind: a.wind + (b.wind - a.wind) * t });
const byId = (id: string) => toL(lights.find((l) => l.id === id) ?? lights[0]);

export type ScrollHooks = { onProgress?: (p: number) => void };

export function createScroll(root: HTMLElement, water: { state: WaterState; updateBand: () => void; bakeTitle: () => void } | null, hooks: ScrollHooks = {}) {
  if (water) water.state.baseMix = 1;
  const wrapper = root.querySelector<HTMLElement>('.water')!;
  const curtain = root.querySelector<HTMLElement>('.curtain');
  const probe = document.createElement('div'); probe.style.cssText = 'position:fixed;top:0;left:0;height:100svh;width:0;pointer-events:none;visibility:hidden;padding-bottom:env(safe-area-inset-bottom,0px);box-sizing:content-box';
  document.body.appendChild(probe);
  let svh = 0, safe = 0, heroPx = 0, bandPx = 0, duskStart = performance.now();
  // 구간 표. 띠의 윗변이 어느 구간에 있는지로 수면의 빛을 정한다. 암전은 구간 위아래 20svh
  type Sec = { el: HTMLElement; light: L; top: number; bot: number; fadeTop: boolean; fadeBot: boolean };
  let secs: Sec[] = [];
  const floorL = byId('credits');
  const measure = () => {
    svh = probe.offsetHeight; safe = parseFloat(getComputedStyle(probe).paddingBottom) || 0; svh -= safe;
    heroPx = 0.38 * svh + safe; bandPx = Math.max(0.15 * svh, 88) + safe;
    secs = [...root.querySelectorAll<HTMLElement>('[data-light]')].map((el) => {
      const r = el.getBoundingClientRect(); const top = r.top + window.scrollY;
      const id = el.dataset.light!;
      return { el, light: byId(id), top, bot: top + r.height, fadeTop: id !== 'two-years', fadeBot: id !== 'people' };
    });
  };
  measure();
  function sample(y: number): L {
    const z = 0.2 * svh;
    for (const s of secs) {
      if (y < s.top || y >= s.bot) continue;
      if (s.fadeTop && y < s.top + z) return lerpL(floorL, s.light, (y - s.top) / z);
      if (s.fadeBot && y > s.bot - z) return lerpL(s.light, floorL, (y - (s.bot - z)) / z);
      return s.light;
    }
    return floorL;
  }
  let lastY = -1, lastP = -1, vel = 0, lastT = 0, running = true, cssTick = 0;
  const hero = byId('hero'), dusk = byId('hero-dusk');
  const people = () => secs.find((s) => s.el.dataset.light === 'people');
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
      // 막은 위로 걷히며 모인다. 올라가는 동안 천이 가볍게 흔들린다
      if (curtain) { const e = p * p * (3 - 2 * p); curtain.style.transform = `translate3d(0, ${(-e * 62).toFixed(2)}%, 0) scaleY(${(1 - 0.5 * e).toFixed(3)}) skewX(${(Math.max(-1, Math.min(1, vel)) * 2 * (1 - p)).toFixed(2)}deg)`; curtain.style.opacity = String(1 - Math.max(0, (p - 0.85) / 0.15)); }
      if (water) water.state.baseMix = 1 - p;
      wrapper.classList.toggle('is-band', p > 0.98);
      wrapper.classList.toggle('is-hero', p < 0.02);
      water?.updateBand();
      hooks.onProgress?.(p);
      lastP = p;
    }
    // 첫 화면의 빛. 머물면 90초에 걸쳐 저물고 스크롤이 앞당긴다
    const duskT = Math.max(0, Math.min(1, (now - duskStart) / 90000 + p));
    const L1 = lerpL(hero, dusk, duskT);
    // 띠의 빛. 막이 올라가는 동안 첫 화면의 빛에서 띠 윗변이 놓인 구간의 빛으로
    const L = p > 0 ? lerpL(L1, sample(y + svh + safe - h), p) : L1;
    if (water) { water.state.light.surface = L.skyTop; water.state.light.deep = L.skyBot; water.state.light.sparkle = L.sparkle; water.state.light.wind = L.wind; water.state.lightDir = [0, -0.4 + 0.3 * duskT]; }
    const pp = people();
    if (pp && y + svh > pp.top && y < pp.bot) root.style.setProperty('--shadow-shift', `${Math.max(-12, Math.min(12, (y - pp.top) * 0.03)).toFixed(1)}px`);
    if (now - cssTick > 100) { cssTick = now; root.style.setProperty('--bg-top', css(L1.bgTop)); root.style.setProperty('--bg-bot', css(L1.bgBot)); root.style.setProperty('--sky-top', css(L.skyTop)); root.style.setProperty('--sky-bot', css(L.skyBot)); root.style.setProperty('--dusk', (0.25 + 0.55 * duskT).toFixed(3)); }
  }
  requestAnimationFrame(tick);
  // 그림의 반영 텍스처를 그림과 같은 자리에 놓는다
  const painting = root.querySelector<HTMLElement>('[data-painting]');
  const placeBase = () => { if (!water || !painting) return; const r = painting.getBoundingClientRect(); water.state.baseRect = [r.left, r.width, r.width / 872 * 816]; };
  placeBase();
  const onResize = () => { measure(); lastP = -1; water?.bakeTitle(); placeBase(); };
  window.addEventListener('resize', onResize);
  // 창이 열리거나 영상이 들어오면 구간의 높이가 바뀐다
  const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { measure(); }) : null;
  ro?.observe(document.body);
  return { stop: () => { running = false; }, measure };
}
