import { useEffect, useMemo } from 'react'
import type { SceneRuntimeProps } from '../../types/scene'
import { useSceneEnvironment } from '../../engine/useSceneEnvironment'
import { createNatureTerrain } from './terrain'
import SkyDome from './components/SkyDome'
import GrassField from './components/GrassField'
import Trees from './components/Trees'

/** 时间预设：天空色 / 太阳方向 / 光照强度 / 雾色一起切换，保证画面协调 */
const PRESETS = {
  dawn: {
    top: '#2c3f6b',
    horizon: '#e9a578',
    sun: '#ffd6a8',
    sunDir: [-0.55, 0.3, -0.5] as const,
    sunIntensity: 1.5,
    ambient: 0.42,
    fog: '#c7b3a4',
  },
  noon: {
    top: '#487fbf',
    horizon: '#d6e8f4',
    sun: '#fff8e6',
    sunDir: [0.45, 0.78, 0.32] as const,
    sunIntensity: 2.7,
    ambient: 0.6,
    fog: '#cfe0ea',
  },
  dusk: {
    top: '#1d2440',
    horizon: '#e0754a',
    sun: '#ffb877',
    sunDir: [-0.6, 0.16, -0.55] as const,
    sunIntensity: 1.05,
    ambient: 0.34,
    fog: '#8b7a70',
  },
} as const

export type TimePreset = keyof typeof PRESETS

function num(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/**
 * 自然场景 —— Phase 2 地基版。
 *
 * 效果清单：
 *   - 地形：CPU fBm + ridged 山脊 + 河谷下切，顶点色按高度/坡度混合（草/岩/雪/沙）
 *   - 天空：渐变穹顶 + 太阳晕，三种时间预设
 *   - 植被：InstancedMesh 树（分布受坡度/海拔/河谷/斑块噪声约束）+ 草
 *   - 风动：顶点 Shader 按高度加权 + 位置相位（草与树冠各自不同步）
 *
 * 尚未实现（深化见 docs/effects/nature.md）：水面 Fresnel、域扭曲地形、
 * 阴影、远景 LOD、真实大气散射。
 */
export default function NatureScene({ active, quality, params, onReady }: SceneRuntimeProps) {
  const preset = (params.timePreset === 'dawn' || params.timePreset === 'dusk'
    ? params.timePreset
    : 'noon') as TimePreset
  const look = PRESETS[preset]

  const windStrength = num(params.windStrength, 1)
  const windSpeed = num(params.windSpeed, 1)
  const vegetationDensity = num(params.vegetationDensity, 0.85)
  const fogDensity = num(params.fogDensity, 0.0075)

  const environment = useMemo(
    () => ({ background: look.horizon, fogExp2: [look.fog, fogDensity] as const }),
    [look.horizon, look.fog, fogDensity],
  )
  useSceneEnvironment(environment)

  const terrainGeometry = useMemo(() => createNatureTerrain(), [])
  useEffect(() => () => terrainGeometry.dispose(), [terrainGeometry])

  useEffect(() => {
    onReady?.()
  }, [onReady])

  const grassDensity = quality === 'low' ? vegetationDensity * 0.5 : vegetationDensity

  return (
    <group>
      <ambientLight intensity={look.ambient} color="#dfeaf5" />
      <hemisphereLight args={['#cfe3f5', '#4a5a3a', look.ambient * 0.7]} />
      <directionalLight
        position={[look.sunDir[0] * 60, look.sunDir[1] * 60, look.sunDir[2] * 60]}
        intensity={look.sunIntensity}
        color={look.sun}
      />

      <SkyDome
        topColor={look.top}
        horizonColor={look.horizon}
        sunColor={look.sun}
        sunDir={look.sunDir}
      />

      <mesh geometry={terrainGeometry} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.96} metalness={0} />
      </mesh>

      <Trees
        active={active}
        density={vegetationDensity}
        windStrength={windStrength}
        windSpeed={windSpeed}
      />

      <GrassField
        key={`${grassDensity}-${windStrength}-${windSpeed}`}
        active={active}
        density={grassDensity}
        windStrength={windStrength}
        windSpeed={windSpeed}
      />
    </group>
  )
}
