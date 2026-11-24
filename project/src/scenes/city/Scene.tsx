import { useEffect, useMemo } from 'react'
import type { SceneRuntimeProps } from '../../types/scene'
import { useSceneEnvironment } from '../../engine/useSceneEnvironment'
import { createCityLayout } from './layout'
import Buildings from './components/Buildings'
import Roads from './components/Roads'
import Traffic from './components/Traffic'
import Rain from './components/Rain'

const SKY_DARK = '#04060d'
const FOG_COLOR = '#121c2c'

function num(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/**
 * 未来城市 —— Phase 2 地基版。
 *
 * 效果清单：
 *   - 布局：程序化街区（主干道两侧成排、中心更高）固定种子
 *   - 建筑：单个 InstancedMesh，窗户由片元补丁生成（分格 + 随机点亮 + 冷暖）
 *   - 地面：低 roughness / 高 metalness 近似湿地面；车道线自发光 + 流动脉冲
 *   - 交通：CatmullRom 曲线 + 实例化车身与灯条，方向由切线求得
 *   - 天气：Points 夜雨 + FogExp2
 *
 * 尚未实现（深化见 docs/effects/city.md）：Bloom 后处理、雨天屏幕水滴、
 * 真实反射探针、建筑模块 LOD。
 */
export default function CityScene({ active, quality, params, onReady }: SceneRuntimeProps) {
  const neonIntensity = num(params.neonIntensity, 1.2)
  const trafficSpeed = num(params.trafficSpeed, 1)
  const rainAmount = num(params.rainAmount, 0.45)
  const fogDensity = num(params.fogDensity, 0.013)

  const layout = useMemo(() => createCityLayout(), [])

  const environment = useMemo(
    () => ({ background: SKY_DARK, fogExp2: [FOG_COLOR, fogDensity] as const }),
    [fogDensity],
  )
  useSceneEnvironment(environment)

  useEffect(() => {
    onReady?.()
  }, [onReady])

  const trafficCount = quality === 'low' ? 14 : 26
  const rainAmountScaled = quality === 'low' ? rainAmount * 0.5 : rainAmount

  return (
    <group>
      <ambientLight intensity={0.34} color="#5b78a8" />
      <hemisphereLight args={['#2c3f63', '#05070c', 0.5]} />
      <directionalLight position={[26, 48, -18]} intensity={0.55} color="#9fc0ff" />

      <Roads active={active} neonIntensity={neonIntensity} />
      <Buildings buildings={layout.buildings} neonIntensity={neonIntensity} />
      <Traffic active={active} speed={trafficSpeed} count={trafficCount} />
      <Rain active={active} amount={rainAmountScaled} />
    </group>
  )
}
