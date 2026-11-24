import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { SceneRuntimeProps } from '../../types/scene'
import { useSceneEnvironment } from '../../engine/useSceneEnvironment'

const BUBBLES_X = [-2.5, -1, 0.8, 2.2]

/** 环境：深蓝背景 + 近距雾，营造水体衰减 */
const ENV = {
  background: '#03243b',
  fog: ['#03243b', 8, 40],
} as const

/**
 * 占位场景：水下景观。
 * 用基础几何体验证场景注册/切换系统（instruction/01 §2），
 * 后续 Day 2–3 再替换为地形、鱼群、光束与焦散。
 */
export default function UnderwaterScene({ active, onReady }: SceneRuntimeProps) {
  useSceneEnvironment(ENV)
  const bubblesRef = useRef<Group>(null)

  useEffect(() => {
    onReady?.()
  }, [onReady])

  useFrame((state, delta) => {
    if (!active || !bubblesRef.current) return
    bubblesRef.current.rotation.y += delta * 0.2
    bubblesRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.4
  })

  return (
    <group>
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 14, 4]} intensity={1.4} color="#9fd8ff" />

      {/* 海底平面 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -2.5, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#1d5a6d" roughness={0.9} />
      </mesh>

      {/* 主岩块 */}
      <mesh position={[0, -1.6, -2]}>
        <icosahedronGeometry args={[2.2, 1]} />
        <meshStandardMaterial color="#2f6d7a" roughness={0.8} flatShading />
      </mesh>

      {/* 气泡群（占位动态） */}
      <group ref={bubblesRef} position={[0, 1, 0]}>
        {BUBBLES_X.map((x, i) => (
          <mesh key={i} position={[x, (i % 3) * 1.4, -1 - i]}>
            <sphereGeometry args={[0.35, 16, 16]} />
            <meshStandardMaterial
              color="#aee6ff"
              transparent
              opacity={0.5}
              roughness={0.2}
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}
