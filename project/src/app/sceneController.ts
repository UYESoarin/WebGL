import { create } from 'zustand'
import type {
  Quality,
  SceneId,
  SceneParamValue,
  SceneParamValues,
  SceneStatus,
} from '../types/scene'
import { defaultSceneParams } from './sceneRegistry'

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
  /** 当前场景参数值（默认值来自 sceneRegistry[id].params） */
  params: SceneParamValues
  /** 选择并进入场景：idle → loading（同时重置为该场景默认参数） */
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
  /** 参数面板写入单个参数 */
  setParam: (key: string, value: SceneParamValue) => void
  /** 恢复当前场景默认参数 */
  resetParams: () => void
  /** 调试/参数面板开关 */
  setDebugEnabled: (enabled: boolean) => void
}

export const useSceneController = create<SceneControllerState>()((set) => ({
  status: 'idle',
  sceneId: null,
  quality: 'high',
  debugEnabled: false,
  error: null,
  params: {},

  enterScene: (id) =>
    set({
      status: 'loading',
      sceneId: id,
      error: null,
      params: defaultSceneParams(id),
    }),
  markReady: () => set({ status: 'active' }),
  failScene: (error) => set({ status: 'error', error }),
  retry: () => set((s) => (s.sceneId ? { status: 'loading', error: null } : {})),
  exitToSelector: () =>
    set({ status: 'idle', sceneId: null, error: null }),
  setQuality: (quality) => set({ quality }),
  setParam: (key, value) =>
    set((s) => ({ params: { ...s.params, [key]: value } })),
  resetParams: () =>
    set((s) => (s.sceneId ? { params: defaultSceneParams(s.sceneId) } : {})),
  setDebugEnabled: (debugEnabled) => set({ debugEnabled }),
}))
