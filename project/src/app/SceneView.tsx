import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { sceneRegistry } from './sceneRegistry'
import { useSceneController } from './sceneController'
import SceneViewport from '../engine/SceneViewport'
import HUD from '../components/scene/HUD'
import LoadingScreen from '../components/scene/LoadingScreen'
import ErrorScreen from '../components/scene/ErrorScreen'
import ErrorBoundary from '../components/scene/ErrorBoundary'
import type { SceneRuntimeProps } from '../types/scene'

/**
 * 场景页：负责「代码模块加载」这一阶段（instruction/01 §4）。
 * 资产加载（GLB/纹理/HDR）留到 Day 3 由场景内部完成，这里只做动态 import。
 */
export default function SceneView() {
  const sceneId = useSceneController((s) => s.sceneId)
  const status = useSceneController((s) => s.status)
  const quality = useSceneController((s) => s.quality)
  const debugEnabled = useSceneController((s) => s.debugEnabled)
  const markReady = useSceneController((s) => s.markReady)
  const failScene = useSceneController((s) => s.failScene)
  const exitToSelector = useSceneController((s) => s.exitToSelector)

  const [SceneComponent, setSceneComponent] = useState<
    ComponentType<SceneRuntimeProps> | null
  >(null)

  useEffect(() => {
    if (!sceneId) return
    let cancelled = false
    const meta = sceneRegistry[sceneId]
    setSceneComponent(null)

    meta
      .load()
      .then((mod) => {
        if (!cancelled) setSceneComponent(mod.default)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          failScene(err instanceof Error ? err : new Error(String(err)))
        }
      })

    return () => {
      cancelled = true
    }
  }, [sceneId, failScene])

  if (!sceneId) return null

  if (status === 'error') {
    return <ErrorScreen />
  }

  // 关键：场景组件就绪后才挂载 Canvas。
  // 这样 Canvas 的首次 render 就带着完整的场景子树，不会出现「空树 → 再填充」
  // 的二次 render（黑屏排查结论：避免 R3F root 在空 children 上建立后又重渲染）。
  if (!SceneComponent) {
    return (
      <div className="scene-view" onContextMenu={(e) => e.preventDefault()}>
        <LoadingScreen />
        <HUD />
      </div>
    )
  }

  return (
    <div
      className="scene-view"
      onContextMenu={(e) => e.preventDefault()}
    >
      <ErrorBoundary onExit={exitToSelector}>
        <SceneViewport
          sceneId={sceneId}
          component={SceneComponent}
          quality={quality}
          debugEnabled={debugEnabled}
          onReady={markReady}
          onError={failScene}
        />
      </ErrorBoundary>

      <HUD />
    </div>
  )
}
