// 진입 모듈. 첫 페인트 뒤 유휴 시간에 수면과 스크롤을 시작한다. docs/plan.md 5.2.
import { show } from '../content/show';
import { initTickets, setWater } from './tickets';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const q = new URLSearchParams(location.search);
const off = reduced || q.get('quality') === 'still' || q.get('water') === 'off';

initTickets();
// 고정 주소로 들어오면 그 구간 제목에 포커스를 둔다
if (location.hash) { const h = document.getElementById(location.hash.slice(1)); const t = h?.matches('[tabindex]') ? h : h?.querySelector<HTMLElement>('[tabindex="-1"]'); t?.focus({ preventScroll: true }); }

// 멈춤 대사 줄 고르기. 첫 줄은 대표 대사, 그 뒤는 받은 줄을 섞어서
const lines = [show.texts.mainLine.text, ...show.texts.waterLines.filter(Boolean)];
let order = lines.slice(1).map((_, i) => i + 1); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
let idx = -1;
function nextLine(band: boolean) {
  const el = document.querySelector<HTMLElement>('.water__line'); if (!el) return;
  idx = idx < 0 ? 0 : (order.length ? order[(idx) % order.length] : 0);
  let text = lines[idx] ?? lines[0];
  if (band) { // 띠에서는 세 줄에 들어가는 줄만
    const colW = (document.querySelector('.water')!.clientWidth - 24 - 16) - (document.querySelector<HTMLElement>('[data-ticket-button]')?.offsetWidth ?? 140) - 24;
    const perLine = Math.floor(colW / (14 * 0.966));
    if (colW < 120 || text.length > perLine * 3) { el.textContent = ''; return; }
  }
  el.textContent = text;
}

const wrapper = document.querySelector<HTMLElement>('.water')!;
const canvas = wrapper.querySelector<HTMLCanvasElement>('canvas');
const title = document.querySelector<HTMLElement>('[data-title]')!;
const button = document.querySelector<HTMLElement>('[data-ticket-button]')!;

// 정지 수면(캔버스 없음)에서 닿으면 CSS 동심원 하나
function cssRipple() {
  window.addEventListener('pointerdown', (e) => {
    const r = wrapper.getBoundingClientRect();
    const span = document.createElement('span'); span.className = 'css-ripple';
    span.style.left = `${e.clientX - r.left}px`; span.style.top = `${Math.max(0, e.clientY - r.top)}px`;
    wrapper.appendChild(span); span.addEventListener('animationend', () => span.remove());
  }, { passive: true });
}

async function start() {
  const { createScroll } = await import('./scroll');
  let water = null;
  if (!off && canvas) {
    const { createWater } = await import('./water/index');
    const baseImage = document.querySelector<HTMLImageElement>('[data-reflection]');
    water = createWater({ wrapper, canvas, title, button, baseImage });
  }
  if (!water) { wrapper.dataset.water = 'still'; if (canvas) canvas.remove(); root.classList.add('water-still'); cssRipple(); }
  let band = false;
  createScroll(root, water, { onProgress: (p) => { band = p > 0.98; } });
  setWater(water);
  if (document.querySelector('[data-video]')) { const { initVideo } = await import('./video'); initVideo(water); }
  // 잔잔해지면 대사가 떠오른다
  let wasCalm = false;
  const obs = new MutationObserver(() => { const c = wrapper.classList.contains('is-calm'); if (c && !wasCalm) nextLine(band); wasCalm = c; });
  obs.observe(wrapper, { attributes: true, attributeFilter: ['class'] });
  if (!water) { nextLine(false); wrapper.classList.add('is-calm'); }
}
if (off) start();
else if ('requestIdleCallback' in window) (window as Window & { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback(start, { timeout: 1500 });
else setTimeout(start, 200);
