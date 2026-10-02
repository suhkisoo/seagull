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
  float a1 = p.x * 0.045 + t * 1.0472, a2 = p.y * 0.09 - t * 0.8378 + p.x * 0.02;
  g += amb * vec2(0.045 * cos(a1) + 0.02 * cos(a2), 0.09 * cos(a2)) * 1.4;
#if ${AMB} >= 2
  float a3 = p.x * 0.11 - p.y * 0.07 + t * 1.2566;
  g += amb * 0.5 * vec2(0.11 * cos(a3), -0.07 * cos(a3));
#endif
#if ${AMB} >= 3
  float a4 = -p.x * 0.19 + p.y * 0.13 + t * 2.0944;
  g += amb * 0.25 * vec2(-0.19 * cos(a4), 0.13 * cos(a4));
#endif
  vec3 n = normalize(vec3(-g, 1.0));

  // 제목의 거울점. 잔잔할수록 변위가 작아 상이 또렷하다
  float calm = u_gains.z;
  float disp = u_refract * (1.0 + 0.012 * depth) * mix(1.0, 0.25, calm);
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
  float spec = pow(max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 40.0) * u_gains.y;
  col += spec * u_colSparkle * 0.22;
#endif
  col = mix(col, vec3(0.973, 0.973, 0.925), title * (1.0 - 0.55 * dn) * 0.75);
  col += glow * GLOW_COL;
  col += u_video.rgb * u_video.a * (1.0 - dn) * 0.6;
  gl_FragColor = vec4(col, 1.0);
}`;
}
