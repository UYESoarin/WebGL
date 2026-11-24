import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { applyCaustics, type CausticsUniforms } from '../shaders/caustics'
import { createSeabedGeometry } from '../terrain'

interface SeabedProps {
  active: boolean
  /** 焦散滚动速度倍率 */
  speed: number
  /** 焦散密度（UV 缩放） */
  scale: number
  /** 焦散亮度 */
  intensity: number
}

/**
 * 海底地形 + 焦散。
 * 地形几何一次性生成；焦散通过材质补丁注入，随时间前进（时间累加而非
 * `elapsedTime * speed`，这样改参数时图案不会跳变）。
 */
export default function Seabed({ active, speed, scale, intensity }: SeabedProps) {
  const geometry = useMemo(() => createSeabedGeometry(), [])

  const uniforms = useMemo<CausticsUniforms>(
    () => ({
      uTime: { value: 0 },
      uScale: { value: scale },
      uIntensity: { value: intensity },
      uColor: { value: new THREE.Color('#79e2ff') },
    }),
    // 初始值取自 props；后续变化由下面的 effect 写入
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: '#1b4c5c',
      roughness: 0.94,
      metalness: 0.02,
    })
    applyCaustics(mat, uniforms)
    return mat
  }, [uniforms])

  useEffect(() => {
    uniforms.uScale.value = scale
  }, [uniforms, scale])

  useEffect(() => {
    uniforms.uIntensity.value = intensity
  }, [uniforms, intensity])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame((_, delta) => {
    if (!active) return
    uniforms.uTime.value += delta * speed
  })

  return <mesh geometry={geometry} material={material} receiveShadow />
}
