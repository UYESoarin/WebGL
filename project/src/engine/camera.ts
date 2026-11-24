import type { ElementRef } from 'react'
import type { OrbitControls } from '@react-three/drei'
import type { SceneCameraConfig } from '../types/scene'

type OrbitControlsImpl = ElementRef<typeof OrbitControls>

/**
 * 桥接引用：让 DOM 层（HUD 按钮 / 键盘 R 键）能触达 Canvas 内的
 * OrbitControls 实例。用普通对象而非 React state，避免每帧/每次引用触发重渲染。
 */
export const orbitControlsHandle: { current: OrbitControlsImpl | null } = {
  current: null,
}

/**
 * 重置视角：同时恢复 camera.position 与 controls.target，并调用 update
 * （instruction/01 §3：不能只重置相机位置）。
 */
export function resetCamera(config: SceneCameraConfig): void {
  const controls = orbitControlsHandle.current
  if (!controls) return
  controls.object.position.set(...config.position)
  controls.target.set(...config.target)
  controls.update()
}
