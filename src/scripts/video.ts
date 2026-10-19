// 영상. 썸네일을 누르면 유튜브 플레이어를 불러온다. 재생 중 주변 빛이 내려가고 수면에 느린 빛이 어른거린다. docs/plan.md 3.1의 9.
import type { WaterState } from './water/index';

type YT = { Player: new (el: HTMLElement, o: Record<string, unknown>) => unknown; PlayerState: { PLAYING: number; PAUSED: number; ENDED: number } };
declare global { interface Window { YT?: YT; onYouTubeIframeAPIReady?: () => void } }

export function initVideo(water: { state: WaterState } | null) {
  const box = document.querySelector<HTMLElement>('[data-video]'); if (!box) return;
  const id = box.dataset.youtubeId!; const root = document.documentElement;
  const hint = box.querySelector<HTMLElement>('[data-video-hint]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let playing = false, raf = 0, t0 = 0;
  function dim(on: boolean) {
    playing = on;
    root.style.setProperty('--video-dim', on ? '0.55' : '0');
    if (!water) return;
    cancelAnimationFrame(raf);
    if (!on) { water.state.video = [0, 0, 0, 0]; return; }
    t0 = performance.now();
    const loop = (now: number) => { // 영상의 화소는 읽을 수 없으므로 느리게 변하는 빛으로 흉내 낸다
      const t = (now - t0) / 1000; const a = 0.5 + 0.5 * Math.sin(t * 0.37), b = 0.5 + 0.5 * Math.sin(t * 0.23 + 1.7);
      water.state.video = [0.75 + 0.2 * a, 0.75 + 0.15 * b, 0.6 + 0.2 * a, reduced ? 0 : 0.25 + 0.2 * b];
      if (playing) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }
  function open() {
    const facade = box!.querySelector<HTMLElement>('.video__facade'); if (!facade) return;
    const holder = document.createElement('div'); holder.className = 'video__frame';
    facade.replaceWith(holder);
    for (const b of box!.querySelectorAll('[data-video-open]')) (b as HTMLElement).hidden = true;
    const makePlayer = () => {
      const P = window.YT!.Player;
      new P(holder, { videoId: id, host: 'https://www.youtube-nocookie.com', playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: (e: { target: { getIframe: () => HTMLIFrameElement } }) => { const f = e.target.getIframe(); f.title = '홍보영상'; f.focus(); if (hint) hint.hidden = false; },
          onStateChange: (e: { data: number }) => { const S = window.YT!.PlayerState; if (e.data === S.PLAYING) { dim(true); if (hint) hint.hidden = true; } else if (e.data === S.PAUSED || e.data === S.ENDED) dim(false); },
        } });
    };
    if (window.YT?.Player) makePlayer();
    else {
      window.onYouTubeIframeAPIReady = makePlayer;
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) { const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true; document.head.appendChild(s); }
    }
  }
  for (const b of box.querySelectorAll('[data-video-open]')) b.addEventListener('click', open);
}
