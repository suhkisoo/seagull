// 수면 셰이더. docs/plan.md 4.3. 방식 A: 닿은 점을 값으로 넘겨 식으로 그린다.
export const VERT = `
attribute vec2 a;
uniform vec2 u_size;          // 캔버스 CSS px
varying highp vec2 v;         // CSS px, 위가 0
void main() {
  v = vec2(a.x * 0.5 + 0.5, 0.5 - a.y * 0.5) * u_size;
  gl_Position = vec4(a, 0.0, 1.0);
}`;

export function frag(N: number, SPEC: boolean, AMB: number, SHARP: boolean): string {
  return `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#define N ${N}
varying highp vec2 v;
uniform highp vec4 u_ripple[N];   // x, y, front, amp
uniform vec4 u_params;            // 캔버스 높이, 화소비, waterTop, 살아 있는 물결 수
uniform highp vec4 u_gains;       // 잔물결 세기, 반짝임 세기, 제목 반사 세기(=calm), 시간(60초 감음)
uniform vec4 u_light;             // 빛 방향 xy, 반짝임 방향 xy
uniform vec4 u_glow;              // 버튼 불빛 중심 x, y, 반지름, 세기
uniform vec4 u_lamp;              // 고른 회차의 불빛 x, y, 반지름, 세기
uniform vec4 u_glade;             // 수평선 위 빛이 물에 비친 길. x, 세기, 수평선에서의 반폭(CSS px), 한낮의 아지랑이 0~1
uniform vec3 u_gladeCol;
uniform vec4 u_pts[6];            // 수평선 위 작은 불빛들의 반영. x, 세기, 반폭, 종류(0 늪의 불빛, 1 붉은 점). 1막 극중극
uniform float u_storm;            // 4막의 폭풍 0~1. 덩어리진 바람, 너울, 마루의 물거품
uniform vec3 u_baseRect;          // 바탕 텍스처가 놓인 그림의 left, width, 반영 높이(CSS px)
uniform vec4 u_titleRect;         // x, y, w, h (캔버스 좌표)
uniform vec4 u_video;             // 영상 빛 rgb, 세기
uniform vec3 u_colSurface, u_colDeep, u_colSparkle;
uniform sampler2D u_title;
uniform sampler2D u_base;         // 바탕 텍스처(그림의 반영). u_baseMix가 0이면 안 쓴다
uniform float u_baseMix;
uniform float u_titleOn;
uniform vec2 u_size;
const vec3 GLOW_COL = vec3(0.804, 0.651, 0.408);
const float K = 0.35, RANGE = 420.0;
uniform float u_refract;

void main() {
  float waterTop = u_params.z;
  vec2 p = v;
  float depth = p.y - waterTop;
  if (depth < 0.0) discard;
  float waterH = max(u_params.x - waterTop, 1.0);
  float dn = clamp(depth / waterH, 0.0, 1.0);

  vec2 g = vec2(0.0);
  for (int i = 0; i < N; i++) {
    if (i >= int(u_params.w)) break;
    highp vec4 r = u_ripple[i];
    vec2 dv = p - r.xy;
    highp float d = length(dv) + 1e-3;
    highp float s = d - r.z;
    float w = 16.0 + 0.057 * r.z;
    float env = r.w * exp(-s * s / (2.0 * w * w) - d / RANGE);
    highp float ph = K * s;
    float dhds = env * (K * cos(ph) - sin(ph) * s / (w * w));
    g += dhds * dv / d;
  }
  highp float t = u_gains.w;
  float amb = u_gains.x;
  // 바람의 잔물결. 방향과 파장이 서로 맞지 않는 결 몇 개를 더한다. 수평선에 가까울수록(멀수록) 잘고, 비스듬히 보이니 세로로 눌린다
  float persp = mix(2.4, 1.0, sqrt(dn));
  vec2 q = vec2(p.x, p.y * 2.2) * persp;
  // 4막. 폭풍 이틀째. 바람이 덩어리로 불어 거친 자리와 덜 거친 자리가 물 위를 지나간다
  float gust = 0.5 + 0.5 * sin(dot(vec2(0.83, 0.55), q) * 0.0042 - t * 0.85) * sin(dot(vec2(-0.37, 0.93), q) * 0.0029 + t * 0.53);
  amb *= mix(1.0, 0.35 + 1.5 * gust, u_storm);
  vec2 d1 = vec2(0.970, 0.243), d2 = vec2(-0.829, 0.559), d3 = vec2(0.447, 0.894);
  float k1 = 0.029, k2 = 0.044, k3 = 0.067;
  g += amb * sqrt(persp) * (d1 * k1 * 1.00 * cos(dot(d1, q) * k1 + t * 0.93)
                    + d2 * k2 * 0.62 * cos(dot(d2, q) * k2 - t * 1.31 + 1.7)
                    + d3 * k3 * 0.40 * cos(dot(d3, q) * k3 + t * 1.73 + 4.1)) * 1.15;
#if ${AMB} >= 2
  vec2 d4 = vec2(-0.196, 0.981), d5 = vec2(0.883, -0.469);
  float k4 = 0.103, k5 = 0.151;
  g += amb * sqrt(persp) * (d4 * k4 * 0.26 * cos(dot(d4, q) * k4 - t * 2.27 + 0.6)
                    + d5 * k5 * 0.17 * cos(dot(d5, q) * k5 + t * 2.89 + 2.3)) * 1.15;
#endif
#if ${AMB} >= 3
  vec2 d6 = vec2(0.600, 0.800);
  float k6 = 0.221;
  g += amb * sqrt(persp) * d6 * k6 * 0.10 * cos(dot(d6, q) * k6 - t * 3.41 + 5.2) * 1.15;
#endif
  // 한낮(2막 정오, 덥다). 수평선 가까이에서 공기가 일렁인다
  g.x += u_glade.w * 0.05 * sin(p.y * 1.7 + p.x * 0.021 + t * 7.0) * pow(1.0 - dn, 2.0);
  // 집채만 한 파도. 긴 너울 하나가 방문자 쪽으로 밀려온다. 멈추면 잦아들지만 다 가라앉지는 않는다
  vec2 d7 = vec2(0.28, 0.96);
  float k7 = 0.017, ph7 = dot(d7, q) * k7 - t * 1.25;
  g += u_storm * (1.0 - 0.55 * u_gains.z) * sqrt(persp) * d7 * k7 * 2.7 * cos(ph7);
  vec3 n = normalize(vec3(-g, 1.0));

  // 제목의 거울점. 잔잔할수록 변위가 작아 상이 또렷하다
  float calm = u_gains.z;
  float disp = u_refract * (1.0 + 0.005 * depth) * mix(1.0, 0.3, calm);
  vec2 tp = vec2(p.x, waterTop - depth) + n.xy * disp;
  vec2 uv = (tp - u_titleRect.xy) / u_titleRect.zw;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  vec2 tx = texture2D(u_title, vec2(uv.x, uv.y)).rg;
#if ${SHARP ? 1 : 0}
  float title = mix(tx.g, tx.r, calm) * inside * u_titleOn;
#else
  float title = tx.g * inside * u_titleOn;
#endif

  // 버튼 불빛. 세로로 긴 가우시안
  vec2 gd = (p + n.xy * disp * 0.5) - u_glow.xy;
  float gr = max(u_glow.z, 1.0);
  float glow = u_glow.w * exp(-gd.x * gd.x / (gr * gr) - gd.y * gd.y / (4.0 * gr * gr));
  vec2 ld = (p + n.xy * disp * 0.5) - u_lamp.xy;
  float lr = max(u_lamp.z, 1.0);
  glow += u_lamp.w * exp(-ld.x * ld.x / (lr * lr) - ld.y * ld.y / (5.0 * lr * lr));

  // 물빛. 값으로 받은 색. 바탕 텍스처가 있으면 섞는다
  vec3 col = mix(u_colSurface, u_colDeep, pow(dn, 0.65));
  if (u_baseMix > 0.0) {
    // 그림의 반영 부분을 그림과 같은 자리, 같은 배율로 잇는다. 변위는 물결을 따른다
    vec2 bp = p + n.xy * disp * 1.5;
    vec2 buv = vec2((bp.x - u_baseRect.x) / max(u_baseRect.y, 1.0), (bp.y - waterTop) / max(u_baseRect.z, 1.0));
    float bin = step(0.0, buv.x) * step(buv.x, 1.0) * step(buv.y, 1.0);
    vec3 bcol = texture2D(u_base, clamp(buv, 0.0, 1.0)).rgb;
    col = mix(col, mix(bcol, u_colDeep, 0.22 + 0.5 * dn), u_baseMix * bin);
  }
#if ${SPEC ? 1 : 0}
  vec3 L = normalize(vec3(u_light.xy + u_light.zw * 0.6, 0.7));
  float spec = pow(max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 60.0) * u_gains.y;
  col += spec * u_colSparkle * 0.28 * (1.0 - 0.5 * dn);
#endif
  col = mix(col, vec3(0.973, 0.973, 0.925), title * pow(1.0 - dn, 1.4) * 0.62);
  // 빛의 길. 1막은 막 뜬 달, 2막은 왼편 호수에 비친 해. 원반은 그리지 않고 물에 비친 길만 그린다.
  // 수평선에서는 가늘고 가까울수록 넓어진다. 잔물결의 줄과 기울기가 맞는 곳에서 부서져 반짝이고, 닿으면 흩어진다
  if (u_storm > 0.01) {
    // 바람 쪽 비탈은 어둡고 반대쪽은 밝다. 밤에도 물결의 덩치가 보인다
    col *= 1.0 + u_storm * clamp(g.y * 9.0, -0.35, 0.35);
    // 너울의 마루에 흰 물거품. 바람이 센 자리에서만 끊어져 보인다
    float crest = pow(max(0.0, sin(ph7)), 14.0);
    float br = 0.5 + 0.5 * sin(p.x * 0.045 + q.y * 0.01 + t * 0.7) * sin(p.x * 0.013 - t * 0.4);
    float foam = crest * smoothstep(0.45, 0.9, gust * br + 0.25) * u_storm * (1.0 - 0.7 * u_gains.z) * pow(1.0 - dn, 0.5);
    col = mix(col, vec3(0.80, 0.82, 0.76), foam * 0.55);
  }
  // 1막 극중극. 늪의 불빛들과 호수를 배경으로 나타나는 붉은 점 두 개(지문 177, 192). 불빛은 물 위에 서고 물에는 세로로 부서진 상이 진다
  for (int i = 0; i < 6; i++) {
    vec4 pt = u_pts[i];
    if (pt.y < 0.002) continue;
    float px = (p.x + n.x * disp * 2.2 - pt.x) / max(pt.z * mix(1.0, 2.6, dn), 1.0);
    float rowsP = 0.55 + 0.45 * sin(q.y * 0.23 + t * 2.1 + g.x * 34.0 + pt.x);
    float len = mix(70.0, 150.0, pt.w);
    vec3 pc = mix(vec3(0.80, 0.87, 0.74), vec3(0.66, 0.11, 0.07), pt.w);
    col += pt.y * exp(-px * px) * exp(-depth / len) * rowsP * pc;
  }
  if (u_glade.y > 0.001) {
    float gw = u_glade.z * mix(1.0, 3.4, dn);
    float gx = (p.x + n.x * disp * 2.5 - u_glade.x) / max(gw, 1.0);
    // 반짝임은 물결의 기울기에서만 나온다. 수평선 쪽으로 알맞게 기운 면이 빛을 눈으로 돌려보낸다. 잔잔하면 가는 기둥만 남는다
    float s0 = 0.010 + 0.022 * dn;
    float tilt = (-n.y - s0) / (0.005 + 0.006 * dn);
    float glint = exp(-tilt * tilt) * exp(-n.x * n.x / 0.0006);
    col += u_glade.y * exp(-gx * gx) * (0.22 + 1.6 * glint) * pow(1.0 - dn, 0.8) * u_gladeCol;
  }
  col += glow * GLOW_COL;
  col += u_video.rgb * u_video.a * (1.0 - dn) * 0.6;
  gl_FragColor = vec4(col, 1.0);
}`;
}
