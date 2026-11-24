import { create } from 'zustand'
import type { Quality, SceneId, SceneStatus } from '../types/scene'

/**
 * 场景状态机（plan §5.6）：
 * idle → loading → active → idle（切回首页）
 * loading → error → loading（重试）
 *
 * Phase 1 说明：`entering` 与 `disposing` 已保留在 SceneStatus 类型中，
 * 但本阶段尚未接入淡入淡出过渡（Day 5 / P1），故直接 loading→active、active→idle。
 */
interface SceneControllerState {
  status: SceneStatus
  sceneId: SceneId | null
  quality: Quality
  debugEnabled: boolean
  error: Error | null
  /** 选择并进入场景：idle → loading */
  enterScene: (id: SceneId) => void
  /** 场景内容就绪：loading → active */
  markReady: () => void
  /** 加载/运行失败：→ error */
  failScene: (error: Error) => void
  /** 失败重试：error → loading */
  retry: () => void
  /** 返回选择页：active/error → idle（卸载场景并释放共享视口资源） */
  exitToSelector: () => void
  setQuality: (quality: Quality) => void
}

export const useSceneController = create<SceneControllerState>()((set) => ({
  status: 'idle',
  sceneId: null,
  quality: 'high',
  debugEnabled: false,
  error: null,

  enterScene: (id) => set({ status: 'loading', sceneId: id, error: null }),
  markReady: () => set({ status: 'active' }),
  failScene: (error) => set({ status: 'error', error }),
  retry: () => set((s) => (s.sceneId ? { status: 'loading', error: null } : {})),
  exitToSelector: () =>
    set({ status: 'idle', sceneId: null, error: null }),
  setQuality: (quality) => set({ quality }),
}))
