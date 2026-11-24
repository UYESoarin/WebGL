import { useEffect, useMemo } from 'react'
import type { SceneRuntimeProps } from '../../types/scene'
import { useSceneEnvironment } from '../../engine/useSceneEnvironment'
import Seabed from './components/Seabed'
import LightShafts from './components/LightShafts'
import MarineSnow from './components/MarineSnow'
import FishSchool, { type FishMode } from './components/FishSchool'

/** 水体颜色：背景取更深的一档，雾色略亮，形成「越远越亮」的水下错觉 */
const WATER_DEEP = '#031a2a'
const WATER_FOG = '#072e44'

function num(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** 岩块摆位：[x, y, z, 半径, 缩放Y] */
const BOULDERS: readonly [number, number, number, number, number][] = [
  [-6.5, -2.2, -4, 1.6, 0.7],
  [7.2, -2.4, -7, 2.2, 0.6],
  [1.5, -2.0, -14, 2.8, 0.55],
  [-10.5, -2.6, 3, 1.9, 0.65],
]

/**
 * 水下场景 —— Phase 2 地基版。
 *
 * 组成（每项都可单独关闭/调参，见 HUD「参数」面板）：
 *   - 水体：FogExp2 指数雾 + 深蓝背景（Beer–Lambert 的可调近似）
 *   - 海床：一次性 CPU 生成的 fBm 沙丘 + 边缘抬升 + 焦散材质补丁
 *   - 光束：倾斜半透明平面 + 软边/噪声扰动（丁达尔近似）
 *   - 颗粒：marine snow 点精灵，缓慢下沉 + 漂移
 *   - 鱼群：InstancedMesh + CPU 运动（orbit/wave 两种确定性模式）
 *
 * 尚未实现（深化路线见 docs/effects/underwater.md）：Boids 三规则、体积光后处理、
 * 水面 Snell's window、真实焦散纹理、鱼体骨骼动画。
 */
export default function UnderwaterScene({
  active,
  quality,
  params,
  onReady,
}: SceneRuntimeProps) {
  const values = useMemo(
    () => ({
      fogDensity: num(params.fogDensity, 0.045),
      causticsSpeed: num(params.causticsSpeed, 0.55),
      causticsScale: num(params.causticsScale, 0.5),
      causticsIntensity: num(params.causticsIntensity, 0.9),
      beamIntensity: num(params.beamIntensity, 1),
      particleCount: num(params.particleCount, 600),
      fishCount: num(params.fishCount, 48),
      fishSpeed: num(params.fishSpeed, 1),
      fishMode: (params.fishMode === 'wave' ? 'wave' : 'orbit') as FishMode,
    }),
    [params],
  )

  const environment = useMemo(
    () => ({
      background: WATER_DEEP,
      fogExp2: [WATER_FOG, values.fogDensity] as const,
    }),
    [values.fogDensity],
  )
  useSceneEnvironment(environment)

  useEffect(() => {
    onReady?.()
  }, [onReady])

  // 画质降级：低画质只减少最贵的粒子量（鱼群数量由用户参数控制）
  const particleCount =
    quality === 'low' ? Math.round(values.particleCount * 0.5) : values.particleCount

  return (
    <group>
      {/* 光照：水下以散射为主，环境光给底，平行光模拟穿透水面的主光 */}
      <ambientLight intensity={0.6} color="#8fd6ff" />
      <hemisphereLight args={['#c8f2ff', '#04202f', 0.55]} />
      <directionalLight position={[9, 20, 7]} intensity={2.1} color="#e2f7ff" />

      <Seabed
        active={active}
        speed={values.causticsSpeed}
        scale={values.causticsScale}
        intensity={values.causticsIntensity}
      />

      {/* 岩块：给海床提供前中远景的剪影层次（占位，后续可换为更精细模型） */}
      {BOULDERS.map(([x, y, z, r, scaleY], i) => (
        <mesh key={i} position={[x, y, z]} scale={[r, r * scaleY, r]} castShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial
            color="#20505f"
            roughness={0.85}
            metalness={0.05}
            flatShading
          />
        </mesh>
      ))}

      <LightShafts active={active} intensity={values.beamIntensity} />

      <FishSchool
        key={`${values.fishCount}-${values.fishMode}`}
        active={active}
        count={values.fishCount}
        speed={values.fishSpeed}
        mode={values.fishMode}
      />

      <MarineSnow key={particleCount} active={active} count={particleCount} />
    </group>
  )
}
