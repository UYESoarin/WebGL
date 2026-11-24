import { useMemo } from 'react'
import * as THREE from 'three'

interface SkyDomeProps {
  topColor: string
  horizonColor: string
  sunColor: string
  sunDir: readonly [number, number, number]
}

/**
 * 渐变天空（instruction/03 §4 的 MVP）：大球体 + 顶点法线方向的垂直渐变，
 * 叠加太阳方向的高光晕。比 `scene.background` 纯色更能提供空间层次。
 */
export default function SkyDome({ topColor, horizonColor, sunColor, sunDir }: SkyDomeProps) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color(topColor) },
          uHorizon: { value: new THREE.Color(horizonColor) },
          uSunColor: { value: new THREE.Color(sunColor) },
          uSunDir: { value: new THREE.Vector3(...sunDir).normalize() },
        },
        vertexShader: /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
        fragmentShader: /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
varying vec3 vDir;

void main() {
  float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 sky = mix(uHorizon, uTop, smoothstep(0.42, 0.85, h));
  // 地平线附近压暗一点，避免「贴纸感」
  sky *= 0.85 + 0.15 * smoothstep(0.0, 0.3, h);
  // 太阳光晕
  float sun = pow(max(dot(vDir, uSunDir), 0.0), 90.0);
  float halo = pow(max(dot(vDir, uSunDir), 0.0), 8.0) * 0.18;
  sky += uSunColor * (sun * 1.4 + halo);
  gl_FragColor = vec4(sky, 1.0);
}
`,
      }),
    [topColor, horizonColor, sunColor, sunDir],
  )

  return (
    <mesh geometry={useMemo(() => new THREE.SphereGeometry(240, 32, 20), [])} material={material} frustumCulled={false} />
  )
}
