import type { SceneConfig } from '../../types/scene'

export const underwaterConfig: SceneConfig = {
  camera: {
    position: [0, 4, 12],
    target: [0, 0, 0],
    minDistance: 3,
    maxDistance: 30,
    minPolarAngle: 0.1,
    maxPolarAngle: 1.5,
  },
  params: [],
}
