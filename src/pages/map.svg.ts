// 오시는 길 지도의 바탕. src/content/map.json(OpenStreetMap 자료)을 빌드 때 SVG 한 장으로 그린다. docs/plan.md 9.5.4.
// 그림으로 불러 쓰므로 색은 여기서 정한다. 4막 램프의 방(종이) 위에 짙은 초록 가는 선(10/8, 전에는 밤의 초록 위 아이보리). 이름 글자는 페이지 쪽(Map.astro)에서 얹는다.
import type { APIRoute } from 'astro';
import map from '../content/map.json';
import { palette } from '../content/lights';

type MapData = { ready: true; size: number; roads: Record<'major' | 'minor' | 'path', string>; rails: Record<'open' | 'tunnel', string>; water: string; campus: string; buildings: string; venue: { outline: string } };

export const GET: APIRoute = () => {
  const m = map as unknown as MapData | { ready: false };
  const S = m.ready ? m.size : 1000;
  const I = palette.floor;
  const path = (d: string, attrs: string) => (d ? `<path d="${d}" ${attrs}/>` : '');
  const body = m.ready
    ? [
      path(m.water, `fill="${I}" fill-opacity=".05"`),
      path(m.campus, `fill="${I}" fill-opacity=".045" stroke="${I}" stroke-opacity=".22" stroke-width=".6" vector-effect="non-scaling-stroke"`),
      path(m.buildings, `fill="${I}" fill-opacity=".09"`),
      `<g fill="none" stroke="${I}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke">`,
      path(m.rails.tunnel, `stroke-opacity=".28" stroke-width=".9" stroke-dasharray="3 5" vector-effect="non-scaling-stroke"`),
      path(m.roads.path, `stroke-opacity=".3" stroke-width=".6" stroke-dasharray="1 3" vector-effect="non-scaling-stroke"`),
      path(m.roads.minor, `stroke-opacity=".42" stroke-width=".7" vector-effect="non-scaling-stroke"`),
      path(m.roads.major, `stroke-opacity=".78" stroke-width="1.6" vector-effect="non-scaling-stroke"`),
      path(m.rails.open, `stroke-opacity=".55" stroke-width="1" vector-effect="non-scaling-stroke"`),
      '</g>',
      path(m.venue.outline, `fill="${I}" fill-opacity=".9"`),
    ].join('')
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">${body}</svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
