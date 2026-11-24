import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface MarineSnowProps {
  active: boolean
  /** 粒子数量（0 表示关闭） */
  count: number
}

const BOUNDS = { x: 22, z: 22, yMin: -6.5, yMax: 9.5 } as const

/**
 * 悬浮颗粒（marine snow / 浮游物）：instruction/02 §5。
 * 本阶段用 CPU 逐帧更新 position（几百个点成本极低、逻辑最直观）；
 * 粒子数上万时应改为顶点着色器内位移 + Points/InstancedMesh（见深化路线）。
 */
export default function MarineSnow({ active, count }: MarineSnowProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(Math.max(count, 1) * 3)
    for (let i = 0; i < count; i += 1) {
      const k = i * 3
      positions[k] = (Math.random() - 0.5) * 2 * BOUNDS.x
      positions[k + 1] = BOUNDS.yMin + Math.random() * (BOUNDS.yMax - BOUNDS.yMin)
      positions[k + 2] = (Math.random() - 0.5) * 2 * BOUNDS.z
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [count])

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#cfeeff',
        size: 0.055,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame((state, delta) => {
    if (!active || count === 0) return
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute
    const array = attr.array as Float32Array
    const time = state.clock.elapsedTime
    const step = Math.min(delta, 0.05) // 切页签回来时 delta 可能很大，做钳制避免"瞬移"

    for (let i = 0; i < count; i += 1) {
      const k = i * 3
      // 缓慢下沉 + 水平漂移（不同粒子用序号错开相位/速度）
      array[k + 1] -= step * (0.10 + (i % 5) * 0.018)
      array[k] += Math.sin(time * 0.5 + i * 1.7) * step * 0.12
      array[k + 2] += Math.cos(time * 0.4 + i * 2.3) * step * 0.10

      if (array[k + 1] < BOUNDS.yMin) {
        array[k + 1] = BOUNDS.yMax
        array[k] = (Math.random() - 0.5) * 2 * BOUNDS.x
        array[k + 2] = (Math.random() - 0.5) * 2 * BOUNDS.z
      }
      if (array[k] > BOUNDS.x) array[k] -= 2 * BOUNDS.x
      else if (array[k] < -BOUNDS.x) array[k] += 2 * BOUNDS.x
      if (array[k + 2] > BOUNDS.z) array[k + 2] -= 2 * BOUNDS.z
      else if (array[k + 2] < -BOUNDS.z) array[k + 2] += 2 * BOUNDS.z
    }

    attr.needsUpdate = true
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}
