import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

interface StarFieldProps {
  /** 星点数量倍率 0–2 */
  density: number
}

interface LayerSpec {
  radius: number
  size: number
  count: number
  color: string
  opacity: number
}

/** 三层星场：远层小而密、近层少量更亮（instruction/05 §2） */
const LAYERS: readonly LayerSpec[] = [
  { radius: 150, size: 0.9, count: 2600, color: '#cfd8ff', opacity: 0.55 },
  { radius: 110, size: 1.5, count: 700, color: '#e8f1ff', opacity: 0.8 },
  { radius: 80, size: 2.4, count: 140, color: '#fff3d6', opacity: 1 },
]

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 球壳均匀采样，避免星点聚成平面 */
function onShell(rand: () => number, radius: number, out: THREE.Vector3): THREE.Vector3 {
  const u = rand() * 2 - 1
  const phi = rand() * Math.PI * 2
  const s = Math.sqrt(1 - u * u)
  out.set(Math.cos(phi) * s * radius, u * radius, Math.sin(phi) * s * radius)
  return out
}

export default function StarField({ density }: StarFieldProps) {
  const layers = useMemo(() => {
    const rand = mulberry32(90210)
    const v = new THREE.Vector3()
    return LAYERS.map((spec) => {
      const count = Math.max(0, Math.round(spec.count * density))
      const positions = new Float32Array(count * 3)
      for (let i = 0; i < count; i += 1) {
        onShell(rand, spec.radius, v)
        positions[i * 3] = v.x
        positions[i * 3 + 1] = v.y
        positions[i * 3 + 2] = v.z
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const material = new THREE.PointsMaterial({
        color: spec.color,
        size: spec.size,
        sizeAttenuation: false,
        transparent: true,
        opacity: spec.opacity,
        depthWrite: false,
      })
      return { geometry, material }
    })
  }, [density])

  useEffect(
    () => () => {
      for (const layer of layers) {
        layer.geometry.dispose()
        layer.material.dispose()
      }
    },
    [layers],
  )

  return (
    <group>
      {layers.map((layer, i) => (
        <points key={i} geometry={layer.geometry} material={layer.material} />
      ))}
    </group>
  )
}
