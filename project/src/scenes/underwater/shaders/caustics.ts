import * as THREE from 'three'
import { NOISE_GLSL } from './noise'

/**
 * 焦散（Caustics）近似 —— 材质补丁方案。
 *
 * 原理：水面波峰像无数块「动态透镜」，把平行光汇聚成网格状亮线投在海底。
 * 全物理的做法是求水面高度场的二阶导（光强 ∝ 1/|det(Hessian)|），代价高。
 * 这里用课程级近似（instruction/02 §4）：
 *   1. 取两层不同缩放/方向/速度的值噪声，按权重叠加成连续场 n(x,z,t)；
 *   2. 用 ridged 变换 pow(1−|2n−1|, k) 提取「等值线」——噪声穿过 0.5 的位置最亮，
 *      视觉上就是交错的亮线网络（k 越大亮线越细）；
 *   3. 叠加到材质的 diffuseColor 上，让后续光照/阴影自然作用于亮斑。
 *
 * 注入点：MeshStandardMaterial 的 onBeforeCompile（不重写整套 shader，保留 PBR 光照、
 * 雾、阴影）。这是「给内置材质加自定义效果」的标准做法。
 */

export interface CausticsUniforms {
  uTime: { value: number }
  /** 世界空间 UV 缩放：值越大亮斑越密 */
  uScale: { value: number }
  /** 亮度倍率 */
  uIntensity: { value: number }
  /** 亮线颜色（水越深越偏青蓝） */
  uColor: { value: THREE.Color }
}

export const CAUSTICS_GLSL = /* glsl */ `
/** 单层焦散：ridged 噪声提取等值线 */
float view_causticLayer(vec2 p, float t, float scale) {
  vec2 q = p * scale;
  float n1 = view_noise(q + vec2(t * 0.21, t * 0.13));
  float n2 = view_noise(q * 2.17 + vec2(-t * 0.16, t * 0.19));
  float n = n1 * 0.65 + n2 * 0.35;
  return pow(clamp(1.0 - abs(n * 2.0 - 1.0), 0.0, 1.0), 7.0);
}

float view_caustics(vec2 worldXZ, float t, float scale) {
  // 第二层旋转约 37°，避免两层同向造成的「条纹感」
  vec2 rot = vec2(worldXZ.x * 0.8 - worldXZ.y * 0.6, worldXZ.x * 0.6 + worldXZ.y * 0.8);
  float a = view_causticLayer(worldXZ, t, scale);
  float b = view_causticLayer(rot + 31.7, t * 0.73 + 13.1, scale * 1.37);
  return clamp(a * 0.72 + b * 0.55, 0.0, 1.8);
}
`

/**
 * 给 MeshStandardMaterial 打焦散补丁（幂等：同一材质只应调用一次）。
 * 材质需要在 JSX 里以 `material={material}` 方式挂载，保证在首次渲染前完成注入。
 */
export function applyCaustics(
  material: THREE.MeshStandardMaterial,
  uniforms: CausticsUniforms,
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCausticTime = uniforms.uTime
    shader.uniforms.uCausticScale = uniforms.uScale
    shader.uniforms.uCausticIntensity = uniforms.uIntensity
    shader.uniforms.uCausticColor = uniforms.uColor

    shader.vertexShader =
      /* glsl */ `
varying vec3 vCausticWorldPos;
` + shader.vertexShader.replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
  vCausticWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      )

    shader.fragmentShader =
      /* glsl */ `
uniform float uCausticTime;
uniform float uCausticScale;
uniform float uCausticIntensity;
uniform vec3 uCausticColor;
varying vec3 vCausticWorldPos;

${NOISE_GLSL}
${CAUSTICS_GLSL}
` + shader.fragmentShader.replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
  float viewCaustic = view_caustics(vCausticWorldPos.xz, uCausticTime, uCausticScale);
  diffuseColor.rgb += uCausticColor * viewCaustic * uCausticIntensity;`,
      )
  }

  // 程序缓存键：确保 three 不会把「未打补丁的同材质」与「已打补丁」混用同一 program
  material.customProgramCacheKey = () => 'view-caustics-v1'
  material.needsUpdate = true
}
