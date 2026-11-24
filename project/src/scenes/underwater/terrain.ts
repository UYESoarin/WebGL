import * as THREE from 'three'

/**
 * 海底地形：一次性 CPU 生成（非逐帧）。
 *
 * 为什么在 CPU 生成：地形是静态资产，顶点位置只算一次；用 CPU 生成后
 * `computeVertexNormals()` 能得到正确法线，光照/焦散都能正常作用。
 * 若以后要「运行时改变地形」，再迁到顶点着色器位移（见 docs/effects/underwater.md 深化路线）。
 *
 * 形态由两部分叠加：
 *   1. fBm 沙丘：4 层值噪声 × 振幅，负责「起伏感」；
 *   2. 边缘抬升：半径越大越高，形成地形围墙，避免相机看到平面被裁断的边界。
 */

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return s - Math.floor(s)
}

/** 2D 值噪声（与 shader 中 view_noise 同构，便于对照理解） */
function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)

  const a = hash2(ix, iy)
  const b = hash2(ix + 1, iy)
  const c = hash2(ix, iy + 1)
  const d = hash2(ix + 1, iy + 1)

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

function fbm(x: number, y: number, octaves: number): number {
  let sum = 0
  let amplitude = 0.5
  let frequency = 1
  for (let i = 0; i < octaves; i += 1) {
    sum += valueNoise(x * frequency, y * frequency) * amplitude
    frequency *= 2.03
    amplitude *= 0.5
  }
  return sum
}

export interface SeabedOptions {
  /** 地形边长（世界单位） */
  size?: number
  /** 网格分段数：越大越平滑，顶点数 = (segments+1)² */
  segments?: number
  /** 基准高度（海床平均面） */
  baseHeight?: number
  /** 沙丘振幅 */
  amplitude?: number
  /** 边缘抬升高度（形成地形围墙） */
  rimHeight?: number
}

export function createSeabedGeometry({
  size = 110,
  segments = 128,
  baseHeight = -3.4,
  amplitude = 2.4,
  rimHeight = 9,
}: SeabedOptions = {}): THREE.PlaneGeometry {
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments)
  geometry.rotateX(-Math.PI / 2)

  const position = geometry.attributes.position
  const half = size / 2
  const rimStart = half * 0.52
  const rimEnd = half * 0.98

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const z = position.getZ(i)

    // 1) 沙丘：低频大起伏 + 高频细纹（fBm）
    const dunes = (fbm(x * 0.035, z * 0.035, 4) - 0.45) * amplitude * 2
    // 2) 细沙波纹：只有几厘米级起伏，增强近景质感
    const ripples = (valueNoise(x * 1.6, z * 1.6) - 0.5) * 0.06

    // 3) 边缘抬升：半径超过 rimStart 后平滑升起
    const radius = Math.sqrt(x * x + z * z)
    const rimT = THREE.MathUtils.clamp((radius - rimStart) / (rimEnd - rimStart), 0, 1)
    const rim = rimT * rimT * rimHeight

    // 中心下压一点，让镜头前方形成「海沟」层次
    const basin = -0.6 * Math.exp(-(x * x + z * z) / 320)

    position.setY(i, baseHeight + dunes + ripples + rim + basin)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}
