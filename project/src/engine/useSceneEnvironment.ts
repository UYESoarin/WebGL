import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Color, Fog } from 'three'

/** 场景环境配置（模块常量，保证引用稳定） */
export interface SceneEnvironmentConfig {
  /** 背景色（十六进制字符串） */
  background: string
  /** 可选雾：颜色 + 近平面 + 远平面 */
  fog?: readonly [string, number, number]
}

/**
 * 在共享 Canvas 内声明式设置 / 还原 scene.background 与 scene.fog。
 *
 * 相比 `<color attach="background" />` / `<fog attach="fog" />` 原语，
 * 这里用 useThree 拿到的 scene 显式赋值，不依赖 R3F 的 attach 目标推断，
 * 也避免场景组件根节点是 Fragment + 非 Object3D 子节点时的兼容问题。
 * 卸载时还原，避免切换场景后残留上一个场景的环境。
 */
export function useSceneEnvironment({ background, fog }: SceneEnvironmentConfig) {
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    const prevBackground = scene.background
    const prevFog = scene.fog

    scene.background = new Color(background)
    scene.fog = fog ? new Fog(fog[0], fog[1], fog[2]) : null

    return () => {
      scene.background = prevBackground
      scene.fog = prevFog
    }
  }, [scene, background, fog])
}
