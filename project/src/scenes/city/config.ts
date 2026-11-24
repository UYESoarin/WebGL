import type { SceneConfig } from '../../types/scene'

/**
 * 城市场景参数（plan §7.3 / instruction/04 §6）。
 * 尺度基准：主干道宽 14、长 150，楼高 5–45。
 */
export const cityConfig: SceneConfig = {
  camera: {
    position: [12, 9, 34],
    target: [0, 8, -4],
    minDistance: 6,
    maxDistance: 120,
    minPolarAngle: 0.15,
    maxPolarAngle: 1.5,
  },
  params: [
    {
      key: 'neonIntensity',
      label: '霓虹强度',
      type: 'slider',
      default: 1.2,
      min: 0,
      max: 2.5,
      step: 0.05,
      description: '窗户自发光与车道线的倍率（Bloom 尚未接入，见深化方案）',
      group: '霓虹',
    },
    {
      key: 'trafficSpeed',
      label: '交通速度',
      type: 'slider',
      default: 1,
      min: 0,
      max: 3,
      step: 0.05,
      description: '车辆沿曲线前进的速度倍率',
      group: '交通',
    },
    {
      key: 'rainAmount',
      label: '雨量',
      type: 'slider',
      default: 0.45,
      min: 0,
      max: 1,
      step: 0.05,
      description: '雨滴粒子数量倍率；低画质档再减半',
      group: '天气',
    },
    {
      key: 'fogDensity',
      label: '雾浓度',
      type: 'slider',
      default: 0.013,
      min: 0.002,
      max: 0.04,
      step: 0.001,
      description: 'FogExp2 密度；夜城需要一定雾才有层次',
      group: '天气',
    },
  ],
}
