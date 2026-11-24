import type { SceneConfig } from '../../types/scene'

/**
 * 太空场景参数（plan §7.4 / instruction/05 §6）。
 * 尺度基准：黑洞半径 2.1、吸积盘外缘 6.8、相机距离 4–50。
 */
export const spaceConfig: SceneConfig = {
  camera: {
    position: [0, 4.2, 15],
    target: [0, 0, 0],
    minDistance: 5,
    maxDistance: 40,
    minPolarAngle: 0.35,
    maxPolarAngle: 1.4,
  },
  params: [
    {
      key: 'diskSpeed',
      label: '吸积盘速度',
      type: 'slider',
      default: 0.8,
      min: 0,
      max: 3,
      step: 0.05,
      description: '旋臂纹理沿角度方向推进的速度',
      group: '吸积盘',
    },
    {
      key: 'diskIntensity',
      label: '吸积盘亮度',
      type: 'slider',
      default: 1,
      min: 0,
      max: 2.5,
      step: 0.05,
      description: '环带整体发光倍率',
      group: '吸积盘',
    },
    {
      key: 'starDensity',
      label: '星空密度',
      type: 'slider',
      default: 1,
      min: 0,
      max: 2,
      step: 0.05,
      description: '三层星场的星点数量倍率；低画质档再减少',
      group: '星空',
    },
    {
      key: 'nebulaIntensity',
      label: '星云强度',
      type: 'slider',
      default: 0.8,
      min: 0,
      max: 2,
      step: 0.05,
      description: '背景噪声云的透明度',
      group: '星空',
    },
  ],
}
