import { useEffect, useMemo } from 'react'
import type { SceneRuntimeProps } from '../../types/scene'
import { useSceneEnvironment } from '../../engine/useSceneEnvironment'
import StarField from './components/StarField'
import Nebula from './components/Nebula'
import AccretionDisk from './components/AccretionDisk'
import BlackHoleCore from './components/BlackHoleCore'

function num(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/**
 * 黑洞与太空 —— Phase 2 地基版。
 *
 * 效果清单：
 *   - 星空：三层球壳 Points（远/中/近，大小与亮度不同）
 *   - 星云：两层噪声平面（加法混合），只做远景层次
 *   - 黑洞：暗球（事件视界）+ 细亮环（光子环近似）
 *   - 吸积盘：圆环几何 + 极坐标着色（径向衰减 / 角向旋臂 / 多普勒差）
 *
 * 尚未实现（深化见 docs/effects/space.md）：屏幕空间引力透镜、喷流、星尘 GPU 粒子。
 */
export default function SpaceScene({ active, quality, params, onReady }: SceneRuntimeProps) {
  const diskSpeed = num(params.diskSpeed, 0.8)
  const diskIntensity = num(params.diskIntensity, 1)
  const starDensity = num(params.starDensity, 1)
  const nebulaIntensity = num(params.nebulaIntensity, 0.8)

  const environment = useMemo(() => ({ background: '#010104' }), [])
  useSceneEnvironment(environment)

  useEffect(() => {
    onReady?.()
  }, [onReady])

  const starDensityScaled = quality === 'low' ? starDensity * 0.55 : starDensity

  return (
    <group>
      <ambientLight intensity={0.06} color="#8899ff" />
      {/* 提供极弱的定向光，让黑洞球体边缘有轮廓，但核心仍是纯黑 */}
      <directionalLight position={[6, 10, 8]} intensity={0.35} color="#bcd0ff" />

      <StarField density={starDensityScaled} />
      <Nebula active={active} intensity={nebulaIntensity} />
      <AccretionDisk active={active} speed={diskSpeed} intensity={diskIntensity} />
      <BlackHoleCore />
    </group>
  )
}
