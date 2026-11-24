import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import type { SceneRuntimeProps } from '../../types/scene'
import { useSceneEnvironment } from '../../engine/useSceneEnvironment'

const STAR_COUNT = 800

/** 环境：近黑背景，无雾 */
const ENV = {
  background: '#000005',
} as const

/**
 * 占位场景：黑洞与太空。
 * 后续 Day 2–3 替换为分层星场、吸积盘 Shader 与屏幕空间透镜近似。
 */
export default function SpaceScene({ active, onReady }: SceneRuntimeProps) {
  useSceneEnvironment(ENV)
  const discRef = useRef<Mesh>(null)

  useEffect(() => {
    onReady?.()
  }, [onReady])

  // 星空：分布在大球壳上的点（占位）
  const starPositions = useMemo(() => {
    const arr = new Float32Array(STAR_COUNT * 3)
    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 40 + Math.random() * 40
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      arr[i * 3 + 2] = r * Math.cos(phi)
    }
    return arr
  }, [])

  useFrame((_, delta) => {
    if (!active || !discRef.current) return
    discRef.current.rotation.z += delta * 0.3
  })

  return (
    <group>
      <ambientLight intensity={0.2} />

      {/* 星空 */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#ffffff"
          size={0.12}
          sizeAttenuation
          transparent
          opacity={0.85}
        />
      </points>

      {/* 事件视界（暗色球体） */}
      <mesh>
        <sphereGeometry args={[1.6, 48, 48]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* 吸积盘（占位：旋转发光环带） */}
      <mesh ref={discRef} rotation-x={Math.PI / 2.4}>
        <torusGeometry args={[3, 0.35, 16, 64]} />
        <meshBasicMaterial color="#ff9d2e" />
      </mesh>
    </group>
  )
}
