import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { SceneRuntimeProps } from '../../types/scene'
import { useSceneEnvironment } from '../../engine/useSceneEnvironment'

const TREE_POS: [number, number][] = [
  [-6, -2],
  [-3, -4],
  [0, -5],
  [3, -3],
  [6, -2],
  [-8, 2],
  [8, 3],
  [-4, 4],
  [5, 5],
]

/** 环境：浅天空蓝背景 + 远景雾 */
const ENV = {
  background: '#7ec8e3',
  fog: ['#7ec8e3', 20, 90],
} as const

/**
 * 占位场景：风格化自然地貌。
 * 后续 Day 2–3 替换为程序化地形、植被采样与风动 Shader。
 */
export default function NatureScene({ active, onReady }: SceneRuntimeProps) {
  useSceneEnvironment(ENV)
  const windRef = useRef<Group>(null)

  useEffect(() => {
    onReady?.()
  }, [onReady])

  useFrame((state) => {
    if (!active || !windRef.current) return
    windRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.03
  })

  return (
    <group>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 22, 8]} intensity={1.6} color="#fff7e0" />

      {/* 地面 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -2, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#4f8a3f" roughness={1} />
      </mesh>

      {/* 远景山体 */}
      <mesh position={[-14, 2, -20]}>
        <coneGeometry args={[8, 16, 5]} />
        <meshStandardMaterial color="#5c6b4a" roughness={1} flatShading />
      </mesh>
      <mesh position={[16, 3, -24]}>
        <coneGeometry args={[10, 20, 5]} />
        <meshStandardMaterial color="#4a5a3f" roughness={1} flatShading />
      </mesh>

      {/* 树群（占位：树干 + 树冠，整体轻摆模拟风动） */}
      <group ref={windRef}>
        {TREE_POS.map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 0.7, 0]}>
              <cylinderGeometry args={[0.15, 0.2, 1.4, 8]} />
              <meshStandardMaterial color="#6b4a2f" roughness={1} />
            </mesh>
            <mesh position={[0, 1.9, 0]}>
              <coneGeometry args={[0.9, 2.2, 7]} />
              <meshStandardMaterial color="#2f6b2f" roughness={1} flatShading />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}
