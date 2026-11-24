import type { SceneConfig } from '../../types/scene'

export const cityConfig: SceneConfig = {
  camera: {
    position: [10, 10, 22],
    target: [0, 4, 0],
    minDistance: 6,
    maxDistance: 70,
    minPolarAngle: 0.2,
    maxPolarAngle: 1.4,
  },
  params: [],
}
