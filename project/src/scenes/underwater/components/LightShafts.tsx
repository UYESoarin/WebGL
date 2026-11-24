import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NOISE_GLSL } from '../../../engine/shaders/noise'

interface LightShaftsProps {
  active: boolean
  /** 光束整体强度 0–2 */
  intensity: number
}

/** 光束摆位：[x, z, 绕 Y 旋转, 绕 Z 倾斜, 宽度缩放] */
const SHAFTS: readonly [number, number, number, number, number][] = [
  [-11, -10, 0.32, 0.34, 1.0],
  [-5.5, -2, 0.18, 0.28, 0.8],
  [0, -14, -0.1, 0.3, 1.15],
  [4.5, -4, -0.24, 0.26, 0.72],
  [10, -11, -0.4, 0.33, 0.95],
  [7.5, 6, -0.55, 0.22, 0.6],
  [-8.5, 7, 0.5, 0.24, 0.66],
]

const VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAGMENT_SHADER = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform vec3 uColor;
varying vec2 vUv;

${NOISE_GLSL}

void main() {
  // 横向软边：中心最亮，向两侧 smoothstep 衰减
  float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;
  float soft = pow(clamp(edge, 0.0, 1.0), 2.4);
  // 纵向衰减：靠近水面(uv.y 大)更亮，越深越淡
  float vfade = smoothstep(0.0, 0.92, vUv.y);
  // 噪声扰动：模拟水面波动造成的光束抖动
  float n = view_noise(vec2(vUv.x * 6.0, vUv.y * 1.8 - uTime * 0.09));
  float shimmer = 0.62 + 0.38 * n;
  float alpha = soft * vfade * shimmer * uIntensity * 0.30;
  gl_FragColor = vec4(uColor, clamp(alpha, 0.0, 0.55));
}
`

/**
 * 丁达尔光束（体积光近似，instruction/02 §3）：用倾斜的半透明平面代替体积积分。
 * 相机的环绕视角下会看到平面「薄片感」——这是该近似的已知代价，
 * 深化方案见 docs/effects/underwater.md（多层 billboard / 后处理 god rays）。
 */
export default function LightShafts({ active, intensity }: LightShaftsProps) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(6, 30), [])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: intensity },
          uColor: { value: new THREE.Color('#c9f0ff') },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    // 初始值取自 props；变化由 effect 写入
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

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
    material.uniforms.uTime.value += delta
  })

  return (
    <group>
      {SHAFTS.map(([x, z, rotY, rotZ, width], i) => (
        <mesh
          key={i}
          geometry={geometry}
          material={material}
          position={[x, 11, z]}
          rotation={[0, rotY, rotZ]}
          scale={[width, 1, 1]}
          renderOrder={6}
        />
      ))}
    </group>
  )
}
