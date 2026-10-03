// 오시는 길 지도의 자료를 OpenStreetMap에서 받아 src/content/map.json으로 쓴다. docs/plan.md 9.5.4.
// 세션 안에서는 바깥 주소가 막혀 있어 GitHub Actions(.github/workflows/map-data.yml)에서 돌린다. 손으로도 돌릴 수 있다: node scripts/make-map.mjs
// 공연장을 가운데 두고 사방 HALF 미터를 1000 × 1000 단위의 정사각형에 놓는다. 위가 북쪽.
import { writeFileSync } from 'node:fs';

const HALF = 1100; // 미터. 정사각형 한 변은 2.2km
const SIZE = 1000;
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
// 공연장을 찾을 넓은 틀(서강대학교 둘레)
const SEARCH = [37.545, 126.932, 37.556, 126.948];
// OSM에서 공연장을 찾지 못할 때만 쓰는 자리. 서강대학교 정문 근처. 이때는 map.json의 venue.source가 'fallback'이 된다
const FALLBACK = { lat: 37.5509, lon: 126.9410 };

async function overpass(q) {
  let last;
  for (const url of ENDPOINTS) {
    for (let i = 0; i < 2; i++) {
      try {
        const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: q }), headers: { 'User-Agent': 'seagull-landing-map/1 (static site build)' } });
        if (res.ok) return await res.json();
        last = new Error(`${url} HTTP ${res.status}`);
      } catch (e) { last = e; }
      await new Promise((r) => setTimeout(r, 4000 * (i + 1)));
    }
  }
  throw last;
}

// 1. 공연장 찾기
const sb = SEARCH.join(',');
const found = await overpass(`[out:json][timeout:60];
(
  nwr["name"~"메리홀|마리홀"](${sb});
  nwr["name:ko"~"메리홀"](${sb});
  nwr["name:en"~"Mary ?Hall",i](${sb});
  nwr["name"~"Mary ?Hall",i](${sb});
);
out geom;`);
const centroid = (geom) => { let la = 0, lo = 0; for (const p of geom) { la += p.lat; lo += p.lon; } return { lat: la / geom.length, lon: lo / geom.length }; };
let venueEl = found.elements.find((e) => e.type === 'way' && e.geometry) || found.elements.find((e) => e.type === 'node') || found.elements.find((e) => e.type === 'relation' && e.members);
let venue, source = 'osm';
if (venueEl?.type === 'node') venue = { lat: venueEl.lat, lon: venueEl.lon };
else if (venueEl?.type === 'way') venue = centroid(venueEl.geometry);
else if (venueEl?.type === 'relation') venue = centroid(venueEl.members.flatMap((m) => m.geometry || []));
else { venue = FALLBACK; source = 'fallback'; }
console.log('venue', source, venueEl ? `${venueEl.type}/${venueEl.id} ${venueEl.tags?.name ?? ''}` : '', venue);

// 2. 둘레 자료
const mLat = 110540, mLon = 111320 * Math.cos((venue.lat * Math.PI) / 180);
const dLat = HALF / mLat, dLon = HALF / mLon, pad = 1.08;
const bb = [venue.lat - dLat * pad, venue.lon - dLon * pad, venue.lat + dLat * pad, venue.lon + dLon * pad].map((v) => v.toFixed(6)).join(',');
const data = await overpass(`[out:json][timeout:120][bbox:${bb}];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|pedestrian|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$"];
  way["railway"~"^(rail|subway|light_rail)$"];
  node["railway"="station"];
  way["natural"="water"];
  relation["natural"="water"];
  way["waterway"="riverbank"];
  way["amenity"="university"]["name"~"서강"];
  relation["amenity"="university"]["name"~"서강"];
)->.all;
.all out geom;
way["amenity"="university"]["name"~"서강"]->.u1;
relation["amenity"="university"]["name"~"서강"]->.u2;
(.u1; .u2;)->.u;
.u map_to_area->.campus;
way["building"](area.campus);
out geom;`);

const X = (lon) => ((lon - venue.lon) * mLon / HALF) * (SIZE / 2) + SIZE / 2;
const Y = (lat) => (-(lat - venue.lat) * mLat / HALF) * (SIZE / 2) + SIZE / 2;
const P = (g) => g.map((p) => [X(p.lon), Y(p.lat)]);

// 더글러스-포이커로 점을 줄인다. 한 단위는 2.2m
function simplify(pts, tol = 0.9) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy); let md = 0, mi = -1;
    // 닫힌 고리는 양 끝이 같으므로 그 점에서의 거리로 잰다
    for (let i = a + 1; i < b; i++) { const d = L ? Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L : Math.hypot(pts[i][0] - ax, pts[i][1] - ay); if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
// 틀 밖으로 멀리 나간 부분은 잘라 낸다(선을 여러 토막으로)
const M = 40, inside = ([x, y]) => x > -M && x < SIZE + M && y > -M && y < SIZE + M;
function clipLine(pts) {
  const out = []; let cur = [];
  pts.forEach((p, i) => {
    const near = inside(p) || (i > 0 && inside(pts[i - 1])) || (i < pts.length - 1 && inside(pts[i + 1]));
    if (near) cur.push(p); else if (cur.length) { if (cur.length > 1) out.push(cur); cur = []; }
  });
  if (cur.length > 1) out.push(cur);
  return out;
}
const n = (v) => Math.round(v * 2) / 2;
const d = (pts, close = false) => 'M' + pts.map(([x, y]) => `${n(x)} ${n(y)}`).join(' ') + (close ? 'Z' : '');
const line = (g) => clipLine(simplify(P(g))).map((p) => d(p)).join('');

// 여러 토막의 바깥 테두리를 고리로 잇는다
function rings(ways) {
  const segs = ways.map((w) => w.slice()); const out = [];
  const key = (p) => `${p.lat.toFixed(7)},${p.lon.toFixed(7)}`;
  while (segs.length) {
    let ring = segs.shift();
    let guard = 0;
    while (key(ring[0]) !== key(ring[ring.length - 1]) && guard++ < 500) {
      const end = key(ring[ring.length - 1]);
      const i = segs.findIndex((s) => key(s[0]) === end || key(s[s.length - 1]) === end);
      if (i < 0) break;
      const s = segs.splice(i, 1)[0];
      ring = ring.concat(key(s[0]) === end ? s.slice(1) : s.slice().reverse().slice(1));
    }
    out.push(ring);
  }
  return out;
}
const poly = (el) => {
  if (el.type === 'way' && el.geometry) return d(simplify(P(el.geometry), 0.6), true);
  if (el.type === 'relation') return rings(el.members.filter((m) => m.type === 'way' && m.geometry && m.role !== 'inner').map((m) => m.geometry)).map((r) => d(simplify(P(r), 0.6), true)).join('');
  return '';
};

const roads = { major: [], minor: [], path: [] };
const rails = { open: [], tunnel: [] };
const water = [], campus = [], buildings = [], stations = [];
for (const el of data.elements) {
  const t = el.tags || {};
  if (el.type === 'way' && t.highway) {
    const h = t.highway;
    const cls = /^(motorway|trunk|primary|secondary)/.test(h) ? 'major' : h === 'pedestrian' ? 'path' : 'minor';
    if (t.tunnel === 'yes' || t.layer?.startsWith('-')) continue;
    roads[cls].push(line(el.geometry));
  } else if (el.type === 'way' && t.railway) {
    (t.tunnel === 'yes' || t.tunnel === 'building_passage' || Number(t.layer) < 0 ? rails.tunnel : rails.open).push(line(el.geometry));
  } else if (el.type === 'node' && t.railway === 'station') {
    const name = (t['name:ko'] || t.name || '').replace(/\s*\(.*\)$/, '').trim();
    if (!name) continue;
    const x = X(el.lon), y = Y(el.lat);
    if (x < 30 || x > SIZE - 30 || y < 30 || y > SIZE - 30) continue;
    const label = name.endsWith('역') ? name : `${name}역`;
    const same = stations.find((s) => s.name === label && Math.hypot(s.x - x, s.y - y) < 120);
    if (same) { same.x = (same.x + x) / 2; same.y = (same.y + y) / 2; continue; }
    stations.push({ name: label, x: n(x), y: n(y) });
  } else if (t.natural === 'water' || t.waterway === 'riverbank') {
    water.push(poly(el));
  } else if (t.amenity === 'university') {
    campus.push(poly(el));
  } else if (t.building && el.type === 'way') {
    buildings.push(poly(el));
  }
}
let venueOutline = '';
if (venueEl?.type === 'way') venueOutline = d(P(venueEl.geometry), true);
else if (venueEl?.type === 'relation') venueOutline = poly(venueEl);

const out = {
  ready: true,
  size: SIZE,
  metersPerUnit: (HALF * 2) / SIZE,
  fetchedAt: new Date().toISOString().slice(0, 10),
  venue: { lat: +venue.lat.toFixed(6), lon: +venue.lon.toFixed(6), source, osm: venueEl ? `${venueEl.type}/${venueEl.id}` : '', outline: venueOutline },
  roads: { major: roads.major.join(''), minor: roads.minor.join(''), path: roads.path.join('') },
  rails: { open: rails.open.join(''), tunnel: rails.tunnel.join('') },
  water: water.join(''),
  campus: campus.join(''),
  buildings: buildings.join(''),
  stations: stations.map((s) => ({ name: s.name, x: n(s.x), y: n(s.y) })),
};
writeFileSync(new URL('../src/content/map.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log('roads', Object.fromEntries(Object.entries(roads).map(([k, v]) => [k, v.length])), 'rails', rails.open.length, rails.tunnel.length, 'campus', campus.length, 'buildings', buildings.length, 'stations', stations.map((s) => s.name).join(' '), 'bytes', JSON.stringify(out).length);
