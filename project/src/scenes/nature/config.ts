import type { SceneConfig } from '../../types/scene'

/**
 * 自然场景参数（plan §7.2 / instruction/03 §6）。
 * 尺度基准：地形边长 170、山体最高约 30、相机距离 6–90。
 */
export const natureConfig: SceneConfig = {
  camera: {
    position: [0, 12, 34],
    target: [0, 2, 0],
    minDistance: 6,
    maxDistance: 90,
    minPolarAngle: 0.2,
    maxPolarAngle: 1.45,
  },
  params: [
    {
      key: 'timePreset',
      label: '时间预设',
      type: 'select',
      default: 'noon',
      options: [
        { value: 'dawn', label: '清晨' },
        { value: 'noon', label: '正午' },
        { value: 'dusk', label: '黄昏' },
      ],
      description: '同时切换天空色、太阳方向、光强与雾色',
      group: '大气',
    },
    {
      key: 'windStrength',
      label: '风力',
      type: 'slider',
      default: 1,
      min: 0,
      max: 2,
      step: 0.05,
      description: '顶点位移幅度；根部不动、叶尖摆幅最大',
      group: '风动',
    },
    {
      key: 'windSpeed',
      label: '风速',
      type: 'slider',
      default: 1,
      min: 0,
      max: 3,
      step: 0.05,
      description: '波动相位推进速度',
      group: '风动',
    },
    {
      key: 'vegetationDensity',
      label: '植被密度',
      type: 'slider',
      default: 0.85,
      min: 0,
      max: 1.5,
      step: 0.05,
      description: '同时影响树与草；低画质档草量再减半',
      group: '植被',
    },
    {
      key: 'fogDensity',
      label: '雾浓度',
      type: 'slider',
      default: 0.0075,
      min: 0,
      max: 0.03,
      step: 0.0005,
      description: 'FogExp2 密度；越大远景山体越淡',
      group: '大气',
    },
  ],
}
