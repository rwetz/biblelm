// The rose window cast in dark metal, with two lights circling it, rubric and
// gilt, that catch its bevels and throw a glow onto the page past its edges,
// shadowed by the tracery itself. A fragment shader over the window's distance
// field (sdfMark.ts).

import { useRef } from "react";
import { cn, useTheme } from "@nexis/design";
import { toRgba, useSdfShader } from "./sdfMark";
import roseLit from "./rose-lit.svg";
import { useStill } from "@/lib/power";

const FRAGMENT = `#version 300 es
precision highp float;
#define TAU 6.28318530718
#define MATERIAL_REACH 0.3200
uniform sampler2D uField;
uniform vec2 uFieldScale;
uniform vec2 uResolution;
uniform float uTime;
uniform vec4 uMatP[8];
uniform vec4 uMatC[16];
out vec4 outColor;
#define C_lightA uMatC[0]
#define C_lightB uMatC[1]
#define C_body uMatC[2]
#define P_angle uMatP[0].x
#define P_distance uMatP[0].y
#define P_intensity uMatP[0].z
#define P_reach uMatP[0].w
#define P_core uMatP[1].x
#define P_shadows uMatP[1].y
#define P_bevel uMatP[1].z
#define P_speed uMatP[1].w

struct Surface {
  vec2 p;
  float px;
  float d;
  float cov;
  vec2 n;
  float slope;
  float time;
};

vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }
vec3 toDisplay(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
float shapeAt(vec2 q) { return texture(uField, q * uFieldScale + 0.5).r; }

const float m_RANGE = 2.4;
const float m_HEIGHT = 1.0;
const float m_WRAP = 0.1;
const float m_CW = 1.0;

float m_invSq(float dist) {
  float r = dist / m_RANGE;
  return 1.0 / (1.0 + r * r);
}

float m_facing(vec2 n, vec2 from, vec2 light) {
  vec2 toL = light - from;
  float dist = length(toL);
  float f = clamp((dot(n, toL / max(dist, 1e-4)) + m_WRAP) / (1.0 + m_WRAP), 0.0, 1.0);
  return f * m_invSq(dist);
}

float m_visible(vec2 from, vec2 light, float eps) {
  vec2 seg = light - from;
  float len = length(seg);
  vec2 dir = seg / max(len, 1e-4);
  float vis = 1.0;
  float t = eps * 2.0;
  for (int k = 0; k < 8; k++) {
    if (t >= len) break;
    vec2 q = from + dir * t;
    float dd = shapeAt(q);
    vis = min(vis, clamp(dd / max(t * 0.4, eps), 0.0, 1.0));
    if (vis <= 0.0 || (dot(q, q) > 1.44 && dot(q, dir) > 0.0)) break;
    t += max(dd, eps);
  }
  return vis;
}

vec3 m_tone(vec3 c) { return 1.0 - exp(-c); }

vec4 material(Surface s) {
  float reach = P_reach;
  if (s.d > reach) return vec4(0.0);

  float a = radians(P_angle) + s.time * P_speed;
  vec2 l0 = vec2(cos(a), sin(a)) * P_distance;
  vec2 l1 = -l0;
  vec3 c0 = toLinear(C_lightA.rgb) * P_intensity;
  vec3 c1 = toLinear(C_lightB.rgb) * P_intensity;
  vec3 bodyC = toLinear(C_body.rgb);

  vec3 body = vec3(0.0);
  if (s.cov > 0.0) {
    float rimT = clamp(-s.d / max(P_bevel, 0.003), 0.0, 1.0);
    float sb = min(1.0 - rimT, 0.9995) * smoothstep(0.15, 0.85, s.slope);
    vec3 n = vec3(s.n * sb, sqrt(1.0 - sb * sb));
    vec3 lit = vec3(0.0);
    for (int i = 0; i < 2; i++) {
      vec2 lp = i == 0 ? l0 : l1;
      vec3 lc = i == 0 ? c0 : c1;
      vec2 delta = lp - s.p;
      vec3 L = normalize(vec3(delta, m_HEIGHT));
      float bodyLit = m_invSq(length(delta)) * 0.6;
      vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
      float glint = pow(max(dot(n, H), 0.0), 60.0) * 0.6;
      lit += bodyC * max(dot(n, L), 0.0) * bodyLit + lc * glint * bodyLit;
    }
    body = m_tone(bodyC * 0.3 + lit);
  }

  vec4 glow = vec4(0.0);
  if (s.cov < 1.0) {
    float eps = max(s.px * 1.5, 0.003);
    float lift = max(eps * 2.0 - s.d, 0.0);
    vec2 o = s.p + s.n * lift;
    float d0 = s.d + lift;
    float base = s.slope > 1e-4 ? atan(-s.n.y, -s.n.x) : 0.0;
    float acc0 = 0.0;
    float acc1 = 0.0;
    for (int i = 0; i < 4; i++) {
      float ang = base + (float(i) + 0.5) * TAU / 4.0;
      vec2 dir = vec2(cos(ang), sin(ang));
      float d1 = shapeAt(o + dir * d0);
      float t2 = d0 + max(d1, eps);
      float d2 = shapeAt(o + dir * t2);
      float best = min(d1 / (d0 * m_CW), d2 / (t2 * m_CW));
      float cover = (0.99 - clamp(best, 0.0, 1.0)) / 0.99;
      if (cover > 0.0) {
        vec2 pos = o + dir * t2;
        float gx = shapeAt(pos + vec2(eps, 0.0)) - d2;
        float gy = shapeAt(pos + vec2(0.0, eps)) - d2;
        vec2 hn = normalize(vec2(gx, gy + 1e-6));
        vec2 hit = pos - hn * d2;
        acc0 += cover * m_facing(hn, hit, l0);
        acc1 += cover * m_facing(hn, hit, l1);
      }
    }
    float w = max(0.01, s.px * 1.5);
    float rim = (1.0 - smoothstep(0.0, w, max(s.d, 0.0))) * P_core;
    vec2 ep = s.p - s.n * max(s.d, 0.0);
    float fade = 1.0 - smoothstep(reach * 0.25, reach, max(s.d, 0.0));
    float e0 = acc0 / 4.0 * fade + m_facing(s.n, ep, l0) * rim;
    float e1 = acc1 / 4.0 * fade + m_facing(s.n, ep, l1) * rim;
    if (P_shadows > 0.5) {
      if (e0 > 0.0) e0 *= m_visible(o, l0, eps);
      if (e1 > 0.0) e1 *= m_visible(o, l1, eps);
    }
    vec3 g = m_tone(c0 * e0 + c1 * e1);
    float ga = clamp(max(g.r, max(g.g, g.b)), 0.0, 1.0);
    glow = vec4(g / max(ga, 1e-4), ga);
  }

  vec3 rgb = mix(glow.rgb, body, s.cov);
  float alpha = mix(glow.a, 1.0, s.cov);
  vec3 shown = toDisplay(clamp(rgb * alpha, 0.0, 1.0));
  float outA = max(alpha, max(shown.r, max(shown.g, shown.b)));
  return vec4(shown / max(outA, 1e-4), outA);
}

void main() {
  float unit = min(uResolution.x, uResolution.y) * 0.5;
  vec2 frag = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 p = (frag - uResolution * 0.5) / unit;
  float px = 1.0 / unit;
  float bw = max(0.03, px);
  float e = clamp(bw * 0.2, px * 1.5, max(bw * 0.5, px * 1.5));
  float d = shapeAt(p);
  float aa = clamp(length(vec2(dFdx(d), dFdy(d))), px * 0.5, px * 1.5);
  vec2 g = vec2(shapeAt(p + vec2(e, 0.0)) - shapeAt(p - vec2(e, 0.0)), shapeAt(p + vec2(0.0, e)) - shapeAt(p - vec2(0.0, e))) / (2.0 * e);
  Surface s;
  s.p = p;
  s.px = px;
  s.d = d;
  s.cov = clamp(0.5 - d / aa, 0.0, 1.0);
  s.slope = length(g);
  s.n = s.slope > 1e-5 ? g / s.slope : vec2(0.0);
  s.time = uTime;

  vec4 m = material(s);
  float reach = 1.0 - smoothstep(MATERIAL_REACH * 0.55, MATERIAL_REACH, d);
  float a = clamp(m.a * max(reach, s.cov), 0.0, 1.0);
  outColor = vec4(clamp(m.rgb, 0.0, 1.0) * a, a);
}
`;

/** The metal: lamp-black by night, iron-gall ink by day, so it reads on either page. */
const BODY = { light: "#3a2f24", dark: "#2e2e2e" };

export function LitRose({
  src = roseLit,
  className,
  label,
  lightA = "#a3311d",
  lightB = "#d4a94f",
  angle = 315,
  distance = 1.15,
  intensity = 3,
  reach = 0.13,
  core = 1,
  shadows = true,
  bevel = 0.03,
  speed = 0.15,
}: {
  src?: string;
  className?: string;
  label?: string;
  /** The two lights, opposite each other: rubric and gilt. */
  lightA?: string;
  lightB?: string;
  angle?: number;
  distance?: number;
  intensity?: number;
  reach?: number;
  core?: number;
  shadows?: boolean;
  bevel?: number;
  speed?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useStill();
  const dark = useTheme().resolvedMode === "dark";
  const settings = useRef({ lightA, lightB, angle, distance, intensity, reach, core, shadows, body: BODY.light, bevel, speed });
  settings.current = { lightA, lightB, angle, distance, intensity, reach, core, shadows, body: dark ? BODY.dark : BODY.light, bevel, speed };

  useSdfShader(
    canvasRef,
    src,
    FRAGMENT,
    (gl, at) => {
      const p = settings.current;
      const colors = new Float32Array(64);
      colors.set(toRgba(p.lightA), 0);
      colors.set(toRgba(p.lightB), 4);
      colors.set(toRgba(p.body), 8);
      gl.uniform4fv(at("uMatC"), colors);
      gl.uniform4fv(at("uMatP"), new Float32Array([p.angle, p.distance, p.intensity, p.reach, p.core, p.shadows ? 1 : 0, p.bevel, p.speed, ...new Array(24).fill(0)]));
    },
    // Reduced motion: the lights stand still at their starting angle.
    { reduced: !!reduced, stillTime: 0, deps: [dark] },
  );

  return (
    <canvas
      ref={canvasRef}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("block aspect-square", className)}
    />
  );
}
