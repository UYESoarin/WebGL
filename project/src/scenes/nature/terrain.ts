import * as THREE from 'three'

/**
 * 自然场景地形（instruction/03 §1）。
 *
 * 高度场 h(x,z) = 基础 fBm 丘陵 + 边缘山体（ridged 噪声）+ 河谷下切 + 中心草场压平。
 * 颜色用「顶点色 + 高度/坡度混合」代替贴图（instruction/03 §1.2 的 MVP）：
 *   - 低处草绿，高处偏黄绿；
 *   - 坡度大 → 岩石灰；
 *   - 高处 → 雪白；
 *   - 河谷底 → 沙色。
 */

export const TERRAIN_SIZE = 170

/** 确定性伪随机（mulberry32），用于植被散布 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash2(x: number, y: number): number {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return v - Math.floor(v)
}

function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi)
  const b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1)
  const d = hash2(xi + 1, yi + 1)
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
}

function fbm(x: number, y: number, octaves: number): number {
  let sum = 0
  let amp = 0.5
  let freq = 1
  for (let i = 0; i < octaves; i += 1) {
    sum += valueNoise(x * freq, y * freq) * amp
    freq *= 2.03
    amp *= 0.5
  }
  return sum
}

/** ridged 噪声：1−|2n−1|，用于山脊线 */
function ridged(x: number, y: number): number {
  const n = fbm(x, y, 4)
  return 1 - Math.abs(n * 2 - 1)
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/** 河谷中心线：x 方向的缓慢蛇形 */
export function riverCenter(x: number): number {
  return Math.sin(x * 0.032) * 8 + Math.sin(x * 0.011) * 5
}

function height(x: number, z: number): number {
  const r = Math.hypot(x, z)
  // 边缘山体：距中心 40 以外逐渐抬升，最高约 30
  const mountainMask = smoothstep(34, 78, r)
  const base = fbm(x * 0.014 + 3.1, z * 0.014 + 7.7, 5) * 9 - 2.5
  const ridge = ridged(x * 0.0075 + 11.3, z * 0.0075 + 4.1)
  const mountains = mountainMask * (5 + ridge * 27)
  // 河谷下切
  const d = Math.abs(z - riverCenter(x))
  const valley = -(1 - smoothstep(3.5, 13, d)) * 5.2
  // 中心草场压平（让远处山峰更突出）
  const meadow = 0.55 + 0.45 * smoothstep(10, 30, r)
  return base * meadow + mountains + valley
}

export function sampleHeight(x: number, z: number): number {
  return height(x, z)
}

/** 有限差分近似坡度（0 平地 → 1 陡崖） */
export function sampleSlope(x: number, z: number): number {
  const e = 0.9
  const dx = (height(x + e, z) - height(x - e, z)) / (2 * e)
  const dz = (height(x, z + e) - height(x, z - e)) / (2 * e)
  return Math.min(1, Math.hypot(dx, dz) / 2.2)
}

const C_GRASS_LOW = new THREE.Color('#3f6b33')
const C_GRASS_HIGH = new THREE.Color('#7fa356')
const C_ROCK = new THREE.Color('#6d6558')
const C_SNOW = new THREE.Color('#dde8ee')
const C_SAND = new THREE.Color('#8c7f62')

export function createNatureTerrain(options?: {
  size?: number
  segments?: number
}): THREE.BufferGeometry {
  const size = options?.size ?? TERRAIN_SIZE
  const segments = options?.segments ?? 170
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments)
  geometry.rotateX(-Math.PI / 2)

  const position = geometry.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const color = new THREE.Color()

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const z = position.getZ(i)
    const y = height(x, z)
    position.setY(i, y)

    const slope = sampleSlope(x, z)
    const hNorm = THREE.MathUtils.clamp((y + 2) / 26, 0, 1)
    const riverDist = Math.abs(z - riverCenter(x))

    // 草 → 岩（坡度）→ 雪（高度）；河谷底沙色
    color.copy(C_GRASS_LOW).lerp(C_GRASS_HIGH, Math.min(1, hNorm * 2.4))
    color.lerp(C_ROCK, smoothstep(0.32, 0.62, slope))
    color.lerp(C_SNOW, smoothstep(0.62, 0.86, hNorm) * (1 - smoothstep(0.55, 0.8, slope)))
    color.lerp(C_SAND, (1 - smoothstep(4, 9, riverDist)) * 0.85)

    // 轻微明暗扰动，避免大片纯色
    const tint = 0.92 + valueNoise(x * 0.35, z * 0.35) * 0.16
    colors[i * 3] = color.r * tint
    colors[i * 3 + 1] = color.g * tint
    colors[i * 3 + 2] = color.b * tint
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}
