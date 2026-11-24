import { Canvas } from '@react-three/fiber'
import type { ComponentType } from 'react'
import { sceneRegistry } from '../app/sceneRegistry'
import CameraController from './CameraController'
import type {
  Quality,
  SceneId,
  SceneParamValues,
  SceneRuntimeProps,
} from '../types/scene'

/** 视口公共渲染设置（稳定引用，避免每次 render 重建触发 R3F 重应用） */
const VIEWPORT_CAMERA = { fov: 50, near: 0.1, far: 300 }
const VIEWPORT_GL = {
  antialias: true,
  powerPreference: 'high-performance',
} as const
const VIEWPORT_DPR: [number, number] = [1, 2]

interface SceneViewportProps {
  sceneId: SceneId
  component: ComponentType<SceneRuntimeProps> | null
  quality: Quality
  debugEnabled: boolean
  params: SceneParamValues
  onReady: () => void
  onError: (error: Error) => void
}

/**
 * 唯一共享 Canvas（plan §5.3 / FR-05）：四个场景复用同一个渲染视口。
 * 相机位置不在 Canvas 的 camera prop 上（避免被当作响应式 props 反复重置），
 * 统一由 CameraController 依据当前场景 config 设置。
 */
export default function SceneViewport({
  sceneId,
  component: SceneComponent,
  quality,
  debugEnabled,
  params,
  onReady,
  onError,
}: SceneViewportProps) {
  const config = sceneRegistry[sceneId].camera

  return (
    <Canvas
      className="scene-canvas"
      dpr={VIEWPORT_DPR}
      gl={VIEWPORT_GL}
      camera={VIEWPORT_CAMERA}
    >
      <CameraController config={config} />
      {SceneComponent && (
        <SceneComponent
          active
          quality={quality}
          debugEnabled={debugEnabled}
          params={params}
          onReady={onReady}
          onError={onError}
        />
      )}
    </Canvas>
  )
}
