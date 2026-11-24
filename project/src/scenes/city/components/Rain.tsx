import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface RainProps {
  active: boolean
  /** 0–1 雨量倍率（影响可见粒子数） */
  amount: number
}

const MAX_DROPS = 2400
const AREA = 70
const HEIGHT = 34

/** 城市夜雨（instruction/04 §4 初级版）：Points 向下运动 + 轻微横向风 */
export default function Rain({ active, amount }: RainProps) {
  const count = Math.round(MAX_DROPS * amount)

  const { geometry, material, drops } = useMemo(() => {
    const positions = new Float32Array(MAX_DROPS * 3)
    const drops = new Float32Array(MAX_DROPS)
    for (let i = 0; i < MAX_DROPS; i += 1) {
      positions[i * 3] = (Math.random() * 2 - 1) * AREA
      positions[i * 3 + 1] = Math.random() * HEIGHT
      positions[i * 3 + 2] = (Math.random() * 2 - 1) * AREA
      drops[i] = 12 + Math.random() * 10
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setDrawRange(0, count)

    const material = new THREE.PointsMaterial({
      color: '#9fc4ff',
      size: 0.09,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    return { geometry, material, drops }
  }, [count])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame((_, delta) => {
    if (!active || count === 0) return
    const dt = Math.min(delta, 0.05)
    const position = geometry.attributes.position as THREE.BufferAttribute
    const array = position.array as Float32Array
    for (let i = 0; i < count; i += 1) {
      const iy = i * 3 + 1
      array[iy] -= drops[i] * dt
      array[i * 3] += dt * 1.6
      if (array[iy] < 0) {
        array[iy] = HEIGHT
        array[i * 3] = (Math.random() * 2 - 1) * AREA
      }
    }
    position.needsUpdate = true
  })

  return <points geometry={geometry} material={material} />
}
