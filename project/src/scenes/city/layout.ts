import { mulberry32 } from '../nature/terrain'

export interface CityBuilding {
  x: number
  z: number
  width: number
  depth: number
  height: number
  seed: number
  /** 0 冷色霓虹 1 暖色霓虹 */
  warm: number
}

export interface CityLayout {
  buildings: CityBuilding[]
  /** 主干道沿 Z 轴，x ∈ [-AVENUE_HALF, AVENUE_HALF] */
  avenueHalf: number
  avenueLength: number
}

export const AVENUE_HALF = 7
export const AVENUE_LENGTH = 150

/**
 * 程序化城市布局（instruction/04 §1：先道路与地标，再建筑）。
 * 规则：
 *   - 沿 Z 轴一条主干道，两侧成排街区；
 *   - 街区之间留横向街道，形成透视节奏；
 *   - 中心区更高（地标），向外逐渐降低；
 *   - 全部由固定种子生成，保证每次进入一致。
 */
export function createCityLayout(seed = 51): CityLayout {
  const rand = mulberry32(seed)
  const buildings: CityBuilding[] = []

  const blockDepths = [10, 14, 11, 16, 12]
  let z = -AVENUE_LENGTH / 2

  while (z < AVENUE_LENGTH / 2) {
    const blockDepth = blockDepths[Math.floor(rand() * blockDepths.length)]
    for (const side of [-1, 1]) {
      let cursor = AVENUE_HALF + 1.5
      // 每个街区沿深度方向排 2–3 栋
      const count = 2 + Math.floor(rand() * 2)
      for (let i = 0; i < count; i += 1) {
        const width = 4 + rand() * 4.5
        const depth = 4 + rand() * 4.5
        const centerZ = z + blockDepth / 2 + (rand() - 0.5) * 2
        // 越靠近大道与中心，楼越高
        const central = 1 - Math.min(1, Math.abs(centerZ) / (AVENUE_LENGTH / 2))
        const height = 7 + rand() * 14 + central * central * 24 + (rand() > 0.9 ? 14 : 0)
        buildings.push({
          x: side * (cursor + width / 2),
          z: centerZ,
          width,
          depth,
          height,
          seed: rand(),
          warm: rand(),
        })
        cursor += width + 1.2
      }
      // 街区后排再做一排稍矮的
      const backCount = 2
      for (let i = 0; i < backCount; i += 1) {
        const width = 4 + rand() * 5
        const depth = 4 + rand() * 5
        const x = side * (cursor + 3 + i * 6 + rand() * 2)
        const h = 5 + rand() * 10
        buildings.push({
          x,
          z: z + blockDepth / 2 + (rand() - 0.5) * 4,
          width,
          depth,
          height: h,
          seed: rand(),
          warm: rand(),
        })
      }
    }
    z += blockDepth + 5 + rand() * 3
  }

  return { buildings, avenueHalf: AVENUE_HALF, avenueLength: AVENUE_LENGTH }
}
