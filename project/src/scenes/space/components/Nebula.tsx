import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NOISE_GLSL } from '../../../engine/shaders/noise'

interface NebulaProps {
  active: boolean
  intensity: number
}

const PLANES = [
  { position: [-26, 12, -70] as const, rotation: [0, 0.35, 0.15] as const, scale: [70, 44, 1] as const, color: '#6b4bd8', seed: 3.1 },
  { position: [30, -8, -78] as const, rotation: [0, -0.42, -0.2] as const, scale: [64, 40, 1] as const, color: '#1f7fa8', seed: 9.4 },
] as const

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform vec3 uColor;
uniform float uSeed;
varying vec2 vUv;

${NOISE_GLSL}

void main() {
  vec2 p = vUv * 3.4 + uSeed;
  float n = view_fbm(p + vec2(uTime * 0.012, uTime * -0.008), 5);
  // 中心区域更浓，边缘淡出，避免出现硬边矩形
  vec2 c = vUv - 0.5;
  float falloff = smoothstep(0.62, 0.05, length(c * vec2(1.0, 1.5)));
  float density = smoothstep(0.42, 0.78, n) * falloff;
  vec3 col = uColor * (0.55 + 0.75 * n);
  gl_FragColor = vec4(col, density * uIntensity * 0.5);
}
`

/** 星云（instruction/05 §2）：低透明度噪声平面，只做远景层次，不抢黑洞焦点 */
export default function Nebula({ active, intensity }: NebulaProps) {
  const materials = useMemo(
    () =>
      PLANES.map(
        (plane) =>
          new THREE.ShaderMaterial({
            vertexShader: VERTEX,
            fragmentShader: FRAGMENT,
            uniforms: {
              uTime: { value: 0 },
              uIntensity: { value: intensity },
              uColor: { value: new THREE.Color(plane.color) },
              uSeed: { value: plane.seed },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
          }),
      ),
    // 初始值即可，强度由 effect 同步
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const geometries = useMemo(
    () => PLANES.map(() => new THREE.PlaneGeometry(1, 1)),
    [],
  )

  useEffect(() => {
    for (const material of materials) material.uniforms.uIntensity.value = intensity
  }, [materials, intensity])

  useEffect(
    () => () => {
      for (const material of materials) material.dispose()
      for (const geometry of geometries) geometry.dispose()
    },
    [materials, geometries],
  )

  useFrame((_, delta) => {
    if (!active) return
    for (const material of materials) material.uniforms.uTime.value += Math.min(delta, 0.05)
  })

  return (
    <group>
      {PLANES.map((plane, i) => (
        <mesh
          key={i}
          geometry={geometries[i]}
          material={materials[i]}
          position={plane.position}
          rotation={plane.rotation}
          scale={plane.scale}
          renderOrder={-2}
        />
      ))}
    </group>
  )
}
