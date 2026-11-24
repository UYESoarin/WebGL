import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NOISE_GLSL } from '../../../engine/shaders/noise'

interface AccretionDiskProps {
  active: boolean
  /** 旋转速度倍率 */
  speed: number
  /** 发光强度 */
  intensity: number
}

const INNER = 2.25
const OUTER = 6.8

const VERTEX = /* glsl */ `
varying vec3 vLocal;
void main() {
  vLocal = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform float uInner;
uniform float uOuter;
varying vec3 vLocal;

${NOISE_GLSL}

void main() {
  float r = length(vLocal.xz);
  float angle = atan(vLocal.z, vLocal.x);

  // 内外缘平滑衰减（instruction/05 §3：内缘更亮、外缘渐暗）
  float innerFade = smoothstep(uInner, uInner + 0.42, r);
  float outerFade = 1.0 - smoothstep(uOuter - 1.6, uOuter, r);
  float rim = innerFade * outerFade;

  // 角向流动纹理：噪声沿角度方向推进，形成旋臂
  float swirl = view_fbm(vec2(angle * 2.4 - uTime * 0.55, r * 1.35 + uTime * 0.12), 4);
  float bands = 0.45 + 0.55 * smoothstep(0.25, 0.85, swirl);

  // 多普勒式亮度差：靠近观察者一侧更亮（视觉近似，非物理）
  float doppler = 0.62 + 0.38 * cos(angle - 0.7);

  float heat = smoothstep(uInner, uOuter * 0.62, r);
  vec3 color = mix(vec3(1.0, 0.86, 0.62), vec3(1.0, 0.36, 0.09), 1.0 - heat);
  color = mix(color, vec3(1.0, 0.97, 0.9), innerFade * (1.0 - heat));

  float alpha = rim * bands * doppler * uIntensity;
  gl_FragColor = vec4(color * (1.2 + alpha * 1.6), clamp(alpha, 0.0, 1.0));
}
`

/**
 * 吸积盘（instruction/05 §3）：圆环几何 + 极坐标着色。
 * 极坐标（r/angle）让径向衰减与角向旋臂都能在片元里直接表达，
 * 比旋转一张贴图更可控；多普勒差是视觉近似，不是相对论计算。
 */
export default function AccretionDisk({ active, speed, intensity }: AccretionDiskProps) {
  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.RingGeometry(INNER, OUTER, 180, 8)
    geometry.rotateX(-Math.PI / 2)

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: intensity },
        uInner: { value: INNER },
        uOuter: { value: OUTER },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
    return { geometry, material }
  }, [])

  useEffect(() => {
    material.uniforms.uIntensity.value = intensity
  }, [material, intensity])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame((_, delta) => {
    if (!active) return
    const dt = Math.min(delta, 0.05)
    material.uniforms.uTime.value += dt * speed
  })

  // 轻微倾斜，让环带在画面里呈椭圆（更像真实视角）
  return <mesh geometry={geometry} material={material} rotation={[0.22, 0, 0.12]} renderOrder={2} />
}
