import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Color, Fog, FogExp2 } from 'three'

/** 场景环境配置（各场景 Scene.tsx 用模块常量声明，保证引用稳定） */
export interface SceneEnvironmentConfig {
  /** 背景清屏色 */
  background: string
  /** 线性雾 [颜色, 近, 远]；MVP 阶段最省事，但衰减不物理 */
  fog?: readonly [color: string, near: number, far: number]
  /**
   * 指数雾 [颜色, 密度]：three 内部为 1 − exp(−(σd)²)，
   * 是 Beer–Lambert 吸收的一个可调近似（instruction/02 §2）。
   * 与 fog 互斥，优先使用本项。
   */
  fogExp2?: readonly [color: string, density: number]
}

/**
 * 统一管理 scene.background / scene.fog：
 * 卸载时还原为进入前的值，避免场景切换后污染下一个场景。
 */
export function useSceneEnvironment({
  background,
  fog,
  fogExp2,
}: SceneEnvironmentConfig): void {
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    const prevBackground = scene.background
    const prevFog = scene.fog

    scene.background = new Color(background)
    scene.fog = fogExp2
      ? new FogExp2(fogExp2[0], fogExp2[1])
      : fog
        ? new Fog(fog[0], fog[1], fog[2])
        : null

    return () => {
      scene.background = prevBackground
      scene.fog = prevFog
    }
  }, [scene, background, fog, fogExp2])
}
