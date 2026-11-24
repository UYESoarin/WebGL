import type { ComponentType } from 'react'

/** 场景唯一标识（plan §5.5） */
export type SceneId = 'underwater' | 'nature' | 'city' | 'space'

/** 画质档位（plan §10.2） */
export type Quality = 'low' | 'medium' | 'high'

/** 场景状态机（plan §5.6） */
export type SceneStatus =
  | 'idle'
  | 'loading'
  | 'entering'
  | 'active'
  | 'disposing'
  | 'error'

/** 场景默认相机配置（plan §5.5 + instruction/01 §3） */
export interface SceneCameraConfig {
  /** 初始相机位置 */
  position: [number, number, number]
  /** OrbitControls 观察目标 */
  target: [number, number, number]
  /** 最近缩放距离 */
  minDistance: number
  /** 最远缩放距离 */
  maxDistance: number
  /** 极角下限（弧度，可选，默认 0） */
  minPolarAngle?: number
  /** 极角上限（弧度，可选，默认 Math.PI） */
  maxPolarAngle?: number
}

/**
 * 场景运行时 props：只传生命周期/质量等通用信息，
 * 不把各场景参数合并成巨型接口（plan §17.2 ISP）。
 */
export interface SceneRuntimeProps {
  active: boolean
  quality: Quality
  debugEnabled: boolean
  /** 场景内容就绪后回调，驱动 entering→active */
  onReady?: () => void
  /** 场景内部错误上报 */
  onError?: (error: Error) => void
}

/** 场景元数据 + 动态加载函数（plan §5.5，避免 UI 写死四个场景） */
export interface SceneMeta {
  id: SceneId
  /** 卡片/航线顺序 */
  order: number
  title: string
  subtitle: string
  description: string
  /** 占位缩略图路径 */
  thumbnail: string
  /** 主题色 */
  accent: string
  camera: SceneCameraConfig
  /** 动态 import 场景模块；返回 default 为场景组件 */
  load: () => Promise<{ default: ComponentType<SceneRuntimeProps> }>
}

/** 参数控件类型（plan §20） */
export type SceneParamType = 'slider' | 'toggle' | 'select' | 'preset'

/** 参数 schema（plan §20；Phase 1 只定型，占位场景暂不接 UI） */
export interface SceneParamSchema {
  key: string
  label: string
  type: SceneParamType
  default: number | boolean | string
  min?: number
  max?: number
  step?: number
  unit?: string
  description?: string
  group?: string
}

/** 每个场景 config 的导出契约（instruction/07 §17.3） */
export interface SceneConfig {
  camera: SceneCameraConfig
  /** Phase 1 可为空数组；Day 3 起每场景 ≥2 项 */
  params: SceneParamSchema[]
}
