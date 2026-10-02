// 스크롤 진행값 하나로 띠 높이, 막, 빛을 움직인다. docs/plan.md 3.1, 3.3, 4.2, 9.5.3. 브라우저 기본 스크롤 그대로.
// 방의 빛: 구간은 바탕을 칠하지 않고, 고정된 방(.room)의 색과 글자색(--ink)이 스크롤 위치의 함수로 바뀐다.
// 구간 사이에서는 호수 바닥색까지 어두워졌다가 다음 구간의 빛으로 밝아진다(암전). 사람들에서 2년으로만 꺼지지 않고 이어진다.
import { lights, palette, type Light } from '../content/lights';
import type { WaterState } from './water/index';

type RGB = [number, number, number];
function hex(c: string): RGB { const n = parseInt(c.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB) => `rgb(${Math.round(c[0] * 255)} ${Math.round(c[1] * 255)} ${Math.round(c[2] * 255)})`;
const smooth = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
// WCAG 상대 휘도. 바탕이 이 값보다 밝으면 어두운 글자가, 어두우면 밝은 글자가 대비가 크다(약 0.19에서 같아진다)
const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const lum = (c: RGB) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
type L = { skyTop: RGB; skyBot: RGB; sparkle: RGB; wind: number };
const toL = (l: Light): L => ({ skyTop: hex(l.skyTop), skyBot: hex(l.skyBot), sparkle: hex(l.sparkle), wind: l.wind });
const lerpL = (a: L, b: L, t: number): L => ({ skyTop: mix(a.skyTop, b.skyTop, t), skyBot: mix(a.skyBot, b.skyBot, t), sparkle: mix(a.sparkle, b.sparkle, t), wind: a.wind + (b.wind - a.wind) * t });
const byId = (id: string) => lights.find((l) => l.id === id) ?? lights[0];

const FLOOR = hex(palette.floor), DEEP = hex(palette.deep), IVORY = hex(palette.ivory);

export type ScrollHooks = { onProgress?: (p: number) => void };

export function createScroll(root: HTMLElement, water: { state: WaterState; updateBand: () => void; bakeTitle: () => void } | null, hooks: ScrollHooks = {}) {
  if (water) water.state.baseMix = 1;
  const wrapper = root.querySelector<HTMLElement>('.water')!;
  const curtain = root.querySelector<HTMLElement>('.curtain');
  const probe = document.createElement('div'); probe.style.cssText = 'position:fixed;top:0;left:0;height:100svh;width:0;pointer-events:none;visibility:hidden;padding-bottom:env(safe-area-inset-bottom,0px);box-sizing:content-box';
  document.body.appendChild(probe);
  let svh = 0, safe = 0, heroPx = 0, bandPx = 0, duskStart = performance.now();

  // 방의 빛 정지점. [문서 y, 색, 바람]. 구간마다 위아래로 암전을 넣는다
  type Stop = { y: number; c: RGB; w: number; g?: number };
  let stops: Stop[] = [];
  const measure = () => {
    svh = probe.offsetHeight; safe = parseFloat(getComputedStyle(probe).paddingBottom) || 0; svh -= safe;
    heroPx = 0.38 * svh + safe; bandPx = Math.max(0.15 * svh, 88) + safe;
    stops = [];
    const secs = [...root.querySelectorAll<HTMLElement>('[data-light]')];
    secs.forEach((el, i) => {
      const r = el.getBoundingClientRect(); const top = r.top + window.scrollY, bot = top + r.height;
      const id = el.dataset.light!; const L = byId(id); const c = hex(L.room); const w = L.wind;
      const T = Math.min(0.42 * svh, 0.3 * (bot - top));
      const next = secs[i + 1]?.dataset.light;
      if (id === 'two-years') {
        // 아침의 실내에서 밤으로 기운다. 끝에서 암전
        // 아침의 실내에서 저녁의 누런 빛을 지나 밤으로. 물에서 낮은 빛이 올라온다
        stops.push({ y: top, c: hex(byId('people').room), w: 0.1, g: 0 }, { y: top + 0.3 * (bot - top), c: hex('#9B9D7E'), w: 0.2, g: 0.35 },
          { y: top + 0.62 * (bot - top), c, w, g: 0.55 }, { y: bot - T * 0.6, c, w, g: 0.3 }, { y: bot, c: FLOOR, w, g: 0 });
        return;
      }
      const g = L.glow ?? 0;
      stops.push({ y: top, c: FLOOR, w, g: 0 }, { y: top + T, c, w, g });
      if (next === 'two-years') stops.push({ y: bot, c, w, g });
      else stops.push({ y: bot - T, c, w, g }, { y: bot, c: FLOOR, w, g: 0 });
    });
  };
  measure();
  function roomAt(y: number): { c: RGB; w: number; g: number } {
    if (!stops.length || y <= stops[0].y) return { c: FLOOR, w: 0.15, g: 0 };
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i], b = stops[i + 1];
      if (y >= a.y && y < b.y) { const t = smooth((y - a.y) / Math.max(1, b.y - a.y)); return { c: mix(a.c, b.c, t), w: a.w + (b.w - a.w) * t, g: (a.g ?? 0) + ((b.g ?? 0) - (a.g ?? 0)) * t }; }
    }
    const last = stops[stops.length - 1]; return { c: last.c, w: last.w, g: last.g ?? 0 };
  }

  let lastY = -1, lastP = -1, vel = 0, lastT = 0, running = true, cssTick = 0, lastRoom = '';
  const hero = toL(byId('hero')), dusk = toL(byId('hero-dusk'));
  const people = root.querySelector<HTMLElement>('.section--people');
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
      if (curtain) { const e = smooth(p); curtain.style.transform = `translate3d(0, ${(-e * 70).toFixed(2)}%, 0) scaleY(${(1 - 0.35 * e).toFixed(3)}) skewX(${(Math.max(-1, Math.min(1, vel)) * 1.2 * (1 - p)).toFixed(2)}deg)`; curtain.style.opacity = String(1 - smooth((p - 0.7) / 0.3)); }
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
    // 방의 빛은 화면 높이 58% 자리의 색. 글자색은 방의 밝기를 따라 뒤집힌다
    const room = roomAt(y + 0.58 * svh);
    const ink = mix(IVORY, FLOOR, smooth((lum(room.c) - 0.15) / 0.08));
    // 띠의 물은 늘 어두운 호수다. 방의 빛은 수평선 가까이에만 옅게 비친다
    const bandRoom = roomAt(y + svh - h);
    const B: L = { skyTop: mix(DEEP, bandRoom.c, 0.2), skyBot: FLOOR, sparkle: mix(IVORY, bandRoom.c, 0.25), wind: bandRoom.w };
    const L = p > 0 ? lerpL(L1, B, p) : L1;
    if (water) { water.state.light.surface = L.skyTop; water.state.light.deep = L.skyBot; water.state.light.sparkle = L.sparkle; water.state.light.wind = L.wind; water.state.lightDir = [0, -0.4 + 0.3 * duskT]; }
    if (people) { const pr = people.getBoundingClientRect(); if (pr.bottom > 0 && pr.top < svh) root.style.setProperty('--shadow-shift', `${Math.max(-16, Math.min(16, -pr.top * 0.025)).toFixed(1)}px`); }
    const roomCss = css(room.c);
    if (roomCss !== lastRoom) { lastRoom = roomCss; root.style.setProperty('--room', roomCss); root.style.setProperty('--ink', css(ink)); root.style.setProperty('--glow', room.g.toFixed(3)); }
    if (now - cssTick > 100) { cssTick = now; root.style.setProperty('--sky-top', css(L.skyTop)); root.style.setProperty('--sky-bot', css(L.skyBot)); root.style.setProperty('--dusk', (0.25 + 0.55 * duskT).toFixed(3)); }
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
