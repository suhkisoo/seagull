// 소리. 지시서 5.4, docs/plan.md 3.1의 19, 9.5.5.
// 기본은 무음. "소리 켜기"를 누른 사람에게만 들린다. 선택은 localStorage에 기억하고, 다음 방문에서는 첫 닿기 뒤에 난다.
// 음원이 오기 전이라 전부 걸러 낸 노이즈로 합성한다. 음악은 없다. 이름이 바로 떠오르는 소리(매미, 천둥 같은 것)도 없다.
// 바탕은 물소리 한 겹. 구간에 따라 공기가 바뀐다. 여름 저녁, 정오의 적막, 아침의 실내, 밤의 바람.
// 4막은 지문 그대로 바람과 굴뚝에서 우는 바람, 집채만 한 파도. 멈추면 소리가 조금 올라오고 움직이면 물러난다.
// 구간이 바뀔 때는 소리가 먼저 바뀌고 빛이 뒤따른다(빛보다 화면 높이 4분의 1 앞을 듣는다).
const KEY = 'seagull-sound';

type Profile = { water: number; lp: number; swell: number; period: number; wind: number; howl: number; air: number };
// 구간마다의 공기. 값은 귀로 맞춘 임시값 【확인】
const PROFILES: Record<string, Profile> = {
  hero: { water: 0.3, lp: 520, swell: 0.25, period: 3.8, wind: 0.03, howl: 0, air: 0.012 },        // 여름 저녁. 낮의 열이 남은 습한 물가
  about: { water: 0.15, lp: 720, swell: 0.18, period: 4.4, wind: 0, howl: 0, air: 0.03 },          // 정오의 적막. 물은 멀고 공기만 가늘게
  people: { water: 0.09, lp: 260, swell: 0.2, period: 4.2, wind: 0, howl: 0, air: 0 },             // 아침의 실내. 벽 너머로 막힌 물소리
  'two-years': { water: 0.14, lp: 400, swell: 0.3, period: 4.8, wind: 0.1, howl: 0.015, air: 0 },   // 2년. 바람이 일기 시작한다
  tickets: { water: 0.34, lp: 380, swell: 0.6, period: 5.6, wind: 0.24, howl: 0.07, air: 0 },      // 4막. 폭풍 이틀째, 굴뚝에서 바람이 운다
  credits: { water: 0.2, lp: 450, swell: 0.3, period: 5.0, wind: 0.02, howl: 0, air: 0 },          // 끝. 물만 움직인다
};

export function initSound(root: HTMLElement) {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-sound]')];
  if (!buttons.length) return;
  const Ctx = (window as Window & { webkitAudioContext?: typeof AudioContext }).AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) { for (const b of buttons) b.hidden = true; return; }
  let ctx: AudioContext | null = null, on = false, timer = 0;
  let nodes: { master: GainNode; water: GainNode; waterLp: BiquadFilterNode; wind: GainNode; windBp: BiquadFilterNode; howl: GainNode; howlBp: BiquadFilterNode; air: GainNode; noise: AudioBuffer } | null = null;
  const read = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
  const write = (v: boolean) => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* 사생활 보호 모드 */ } };
  const label = () => { for (const b of buttons) { b.textContent = on ? '소리 끄기' : '소리 켜기'; b.setAttribute('aria-pressed', String(on)); } };

  function build() {
    ctx = new Ctx!();
    const sr = ctx.sampleRate, len = sr * 4;
    const noise = ctx.createBuffer(1, len, sr); const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = (offset: number) => { const s = ctx!.createBufferSource(); s.buffer = noise; s.loop = true; s.start(0, offset); return s; };
    const gain = (v = 0) => { const g = ctx!.createGain(); g.gain.value = v; return g; };
    const filt = (type: BiquadFilterType, f: number, q: number) => { const b = ctx!.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
    const master = gain(0); master.connect(ctx.destination);
    // 물. 낮은 쪽만 남긴 노이즈, 두 번 걸러 부드럽게
    const water = gain(), waterLp = filt('lowpass', 500, 0.4), waterLp2 = filt('lowpass', 900, 0.3);
    src(0).connect(waterLp).connect(waterLp2).connect(water).connect(master);
    // 바람. 가운데 대역이 돌풍에 따라 오르내린다
    const wind = gain(), windBp = filt('bandpass', 500, 0.8);
    src(1.3).connect(windBp).connect(wind).connect(master);
    // 굴뚝에서 우는 바람. 좁은 대역을 두 번 걸러 낮게 운다
    const howl = gain(), howlBp = filt('bandpass', 210, 14), howlBp2 = filt('bandpass', 210, 9);
    src(2.1).connect(howlBp).connect(howlBp2).connect(howl).connect(master);
    // 정오의 공기. 아주 가는 높은 대역
    const air = gain(), airHp = filt('highpass', 2600, 0.5);
    src(3.2).connect(airHp).connect(air).connect(master);
    nodes = { master, water, waterLp, wind, windBp, howl, howlBp, air, noise };
  }

  // 지금 들어야 할 구간. 빛(화면 58%)보다 4분의 1 화면 앞
  function profile(): Profile {
    const vh = window.innerHeight, y = window.scrollY;
    if (y < 0.6 * vh) return PROFILES.hero;
    const probe = 0.58 * vh + 0.25 * vh;
    let id = 'credits';
    for (const el of root.querySelectorAll<HTMLElement>('[data-light]')) { const r = el.getBoundingClientRect(); if (r.top <= probe && r.bottom > probe) { id = el.dataset.light!; break; } }
    return PROFILES[id] ?? PROFILES.credits;
  }
  function update() {
    if (!ctx || !nodes) return;
    const t = ctx.currentTime, P = profile(), k = 0.6; // 시간 상수(초). 소리는 빛보다 빨리 바뀐다
    const gust = 0.5 + 0.5 * Math.sin(t * 0.37) * Math.sin(t * 0.13 + 1.1);
    const swell = 1 - P.swell * 0.5 * (1 - Math.cos((2 * Math.PI * t) / P.period));
    const calm = document.querySelector('.water')?.classList.contains('is-calm') ? 1.2 : 0.85; // 멈추면 조금 올라오고 움직이면 물러난다
    nodes.master.gain.setTargetAtTime(on ? 0.9 * calm : 0, t, on ? 0.8 : 0.3);
    nodes.water.gain.setTargetAtTime(P.water * swell, t, 0.25);
    nodes.waterLp.frequency.setTargetAtTime(P.lp * (0.85 + 0.3 * swell), t, k);
    nodes.wind.gain.setTargetAtTime(P.wind * (0.35 + 0.95 * gust), t, 0.3);
    nodes.windBp.frequency.setTargetAtTime(340 + 640 * gust, t, 0.4);
    nodes.howl.gain.setTargetAtTime(P.howl * gust * gust * 1.4, t, 0.35);
    nodes.howlBp.frequency.setTargetAtTime(185 + 70 * gust, t, 0.5);
    nodes.air.gain.setTargetAtTime(P.air, t, k);
  }
  // 닿으면 물이 한 번 찰랑인다
  function splash() {
    if (!ctx || !nodes || !on) return;
    const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = nodes.noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700 + Math.random() * 500; bp.Q.value = 1.2;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.5);
    s.connect(bp).connect(g).connect(nodes.master); s.start(t, Math.random() * 3); s.stop(t + 0.55);
  }
  async function start() {
    if (!ctx) build();
    if (ctx!.state !== 'running') { try { await ctx!.resume(); } catch { /* */ } }
    on = true; label(); update();
    clearInterval(timer); timer = window.setInterval(update, 100);
  }
  function stop() {
    on = false; label(); update();
    clearInterval(timer);
    window.setTimeout(() => { if (!on) ctx?.suspend().catch(() => {}); }, 1200);
  }
  for (const b of buttons) b.addEventListener('click', () => { if (on) { stop(); write(false); } else { start(); write(true); } });
  window.addEventListener('pointerdown', splash, { passive: true });
  label();
  // 지난번에 켜 두었으면 첫 닿기 뒤에 난다. 브라우저가 닿기 전의 소리를 막는다
  if (read()) {
    const resume = (e: Event) => {
      if ((e.target as HTMLElement | null)?.closest?.('[data-sound]')) return; // 버튼을 누른 경우는 버튼이 처리한다
      for (const ev of ['pointerup', 'keydown']) window.removeEventListener(ev, resume);
      start();
    };
    for (const ev of ['pointerup', 'keydown']) window.addEventListener(ev, resume);
  }
}
