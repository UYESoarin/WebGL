/**
 * 通用 GLSL 工具片段（2D 值噪声 / fBm）。
 *
 * 为什么要自己写：焦散、光束扰动、粒子闪烁都需要「连续可导的随机场」。
 * GLSL 无内置噪声函数，值噪声（value noise）是成本最低、最容易理解的实现：
 *   1. 把空间按整数格子切开，每个格子顶点取一个伪随机值（hash）；
 *   2. 格内用平滑插值（u = 3f² − 2f³，即 smoothstep 曲线）混合四个角点。
 * 比 Perlin 噪声少一次梯度点积，视觉上够用；细节层次靠 fBm 叠加不同频率实现。
 */
export const NOISE_GLSL = /* glsl */ `
float view_hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

/** 2D 值噪声，返回 [0,1]。p 为格点空间坐标（单位：格） */
float view_noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f); // smoothstep 插值，保证一阶导连续
  float a = view_hash21(i);
  float b = view_hash21(i + vec2(1.0, 0.0));
  float c = view_hash21(i + vec2(0.0, 1.0));
  float d = view_hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

/** 分形叠加（fBm）：每层频率翻倍、振幅减半 */
float view_fbm(vec2 p, int octaves) {
  float sum = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 5; i++) {
    if (i >= octaves) break;
    sum += view_noise(p * freq) * amp;
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum;
}
`
