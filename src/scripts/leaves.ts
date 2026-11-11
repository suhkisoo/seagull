// 나무 그늘 한 장. 그림이 아니라 잎 사이로 든 빛과 그림자다. 브라우저에서 한 번 그려 --leaves로 쓴다.
// 2막 정오의 늙은 보리수 그늘(방의 오른쪽 위)과 3막 꺾인 창 너머 마당의 나무(사람들 구간의 오른쪽 창 빛 안)에 쓴다.
// 무대의 나무는 상수 다운, 정원의 북동쪽 끝(연출부 영지 지도). 물 가까운 오른쪽이라 화면에서는 오른쪽 위에서 가지가 드리운다.
export function paintLeaves(root: HTMLElement) {
  const S = 384;
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const x = c.getContext('2d'); if (!x) return;
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // 잎 무리의 그림자가 오른쪽 위에 몰려 있고 왼쪽 아래로 갈수록 성기다. 겹치지 않은 틈으로 빛이 든다. 가지 모양이 드러나지 않게 흩는다
  x.fillStyle = 'rgba(34,46,33,0.13)';
  for (let i = 0; i < 520; i++) {
    const a = rnd(), b = rnd();
    const px = S * (1 - a * a * 0.95), py = S * (b * b * 0.95);
    if (rnd() > (1 - Math.hypot(1 - px / S, py / S) * 0.75)) continue;
    const r = S * (0.006 + 0.016 * rnd());
    x.beginPath(); x.ellipse(px, py, r * 1.7, r, rnd() * Math.PI, 0, Math.PI * 2); x.fill();
  }
  try { root.style.setProperty('--leaves', `url(${c.toDataURL('image/png')})`); } catch { /* 캔버스를 못 쓰면 그늘 없이 */ }
}
