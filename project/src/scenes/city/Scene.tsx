import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { SceneRuntimeProps } from '../../types/scene'
import { useSceneEnvironment } from '../../engine/useSceneEnvironment'

/** [x, z, 宽, 深, 高] */
const BUILDINGS: [number, number, number, number, number][] = [
  [-8, -6, 3, 3, 9],
  [-4, -8, 4, 4, 14],
  [0, -5, 3, 3, 7],
  [4, -9, 5, 5, 18],
  [8, -6, 3, 3, 11],
  [-10, 2, 4, 4, 12],
  [-5, 4, 3, 3, 8],
  [0, 2, 4, 4, 16],
  [6, 4, 3, 3, 10],
  [11, 3, 4, 4, 13],
]

const WARM = '#ff8c42'
const COOL = '#4dd0e1'

/** 环境：深夜蓝黑背景 + 近景雾 */
const ENV = {
  background: '#05060f',
  fog: ['#05060f', 15, 70],
} as const

/**
 * 占位场景：未来科技城市。
 * 后续 Day 2–3 替换为程序化建筑、Emissive 霓虹与 Bloom 后处理。
 */
export default function CityScene({ active, onReady }: SceneRuntimeProps) {
  useSceneEnvironment(ENV)
  const trafficRef = useRef<Group>(null)

  useEffect(() => {
    onReady?.()
  }, [onReady])

  useFrame((state) => {
    if (!active || !trafficRef.current) return
    trafficRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.8) * 12
  })

  return (
    <group>
      <ambientLight intensity={0.3} />
      <directionalLight position={[0, 30, 0]} intensity={0.5} color="#8899ff" />

      {/* 地面 / 道路 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.1, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#0b0d18" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* 建筑群（占位：冷暖自发光交替） */}
      {BUILDINGS.map(([x, z, w, d, h], i) => (
        <mesh key={i} position={[x, h / 2, z]}>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial
            color="#14162a"
            emissive={i % 2 === 0 ? WARM : COOL}
            emissiveIntensity={0.9}
            roughness={0.5}
          />
        </mesh>
      ))}

      {/* 交通（占位动态：一辆发光载具左右往复） */}
      <group ref={trafficRef} position={[0, 0.5, 2]}>
        <mesh>
          <boxGeometry args={[1.2, 0.6, 0.6]} />
          <meshStandardMaterial
            color="#220000"
            emissive="#ff4d4d"
            emissiveIntensity={1.5}
          />
        </mesh>
      </group>
    </group>
  )
}
