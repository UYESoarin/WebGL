import type { SceneId, SceneMeta, SceneParamValue, SceneParamValues } from '../types/scene'
import { underwaterConfig } from '../scenes/underwater/config'
import { natureConfig } from '../scenes/nature/config'
import { cityConfig } from '../scenes/city/config'
import { spaceConfig } from '../scenes/space/config'

/**
 * 场景注册表：集中保存元数据 + 动态 import。
 * 相机默认值以各场景 config.ts 为唯一来源（静态 import，仅数据、不拉入 Three.js）。
 * UI 只依赖 SceneMeta/SceneId，不直接 import 场景内部组件（plan §17.2 DIP）。
 */
export const sceneRegistry: Record<SceneId, SceneMeta> = {
  underwater: {
    id: 'underwater',
    order: 0,
    title: '水下景观',
    subtitle: 'Underwater',
    description: '深蓝与青绿层次、顶部光束、海底生态与鱼群。',
    thumbnail: '/assets/images/scenes/underwater.svg',
    accent: '#38bdf8',
    camera: underwaterConfig.camera,
    params: underwaterConfig.params,
    load: () => import('../scenes/underwater'),
  },
  nature: {
    id: 'nature',
    order: 1,
    title: '风格化自然地貌',
    subtitle: 'Nature',
    description: '山地边界、森林边缘、中心草场与大气层次。',
    thumbnail: '/assets/images/scenes/nature.svg',
    accent: '#4ade80',
    camera: natureConfig.camera,
    params: natureConfig.params,
    load: () => import('../scenes/nature'),
  },
  city: {
    id: 'city',
    order: 2,
    title: '未来科技城市',
    subtitle: 'City',
    description: '夜间城市、建筑群高低错落、霓虹冷暖对比。',
    thumbnail: '/assets/images/scenes/city.svg',
    accent: '#c084fc',
    camera: cityConfig.camera,
    params: cityConfig.params,
    load: () => import('../scenes/city'),
  },
  space: {
    id: 'space',
    order: 3,
    title: '黑洞与太空',
    subtitle: 'Space',
    description: '深色背景、星空层次、黑洞吸积盘视觉中心。',
    thumbnail: '/assets/images/scenes/space.svg',
    accent: '#fbbf24',
    camera: spaceConfig.camera,
    params: spaceConfig.params,
    load: () => import('../scenes/space'),
  },
}

/** 按 order 排序的场景列表，供首页/切换器使用 */
export const sceneList: SceneMeta[] = Object.values(sceneRegistry).sort(
  (a, b) => a.order - b.order,
)

/** 由 config.params 生成默认参数值集合（进入场景/重置时使用） */
export function defaultSceneParams(id: SceneId): SceneParamValues {
  const values: Record<string, SceneParamValue> = {}
  for (const param of sceneRegistry[id].params) values[param.key] = param.default
  return values
}

/** 运行时类型守卫：判断字符串是否为已注册场景 id（供 URL 路由解析使用） */
export function isSceneId(id: string): id is SceneId {
  return id in sceneRegistry
}
