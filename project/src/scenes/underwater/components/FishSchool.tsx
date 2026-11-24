import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export type FishMode = 'orbit' | 'wave'

interface FishSchoolProps {
  active: boolean
  /** 鱼数量（InstancedMesh 实例数） */
  count: number
  /** 游动速度倍率 */
  speed: number
  /** 运动模式：orbit=环绕中心；wave=沿横向推进 + 波形 */
  mode: FishMode
}

interface FishSeed {
  phase: number
  radius: number
  height: number
  scale: number
  jitter: number
}

/** 确定性伪随机（按序号哈希），保证同一 count 下鱼群分布稳定 */
function seedFor(index: number): FishSeed {
  const h = Math.sin(index * 12.9898 + 78.233) * 43758.5453
  const r = (n: number) => {
    const v = Math.sin(h * (n + 1)) * 10000
    return v - Math.floor(v)
  }
  return {
    phase: r(1) * Math.PI * 2,
    radius: 3.4 + r(2) * 4.6,
    height: (r(3) - 0.5) * 3.4,
    scale: 0.7 + r(4) * 1.1,
    jitter: r(5),
  }
}

const FORWARD = new THREE.Vector3(0, 0, 1)
const WAVE_SPAN = 42

/** 时刻 t 时第 i 条鱼的位置（纯函数，便于求导得到朝向） */
function positionAt(
  seed: FishSeed,
  t: number,
  speed: number,
  mode: FishMode,
  out: THREE.Vector3,
): THREE.Vector3 {
  if (mode === 'orbit') {
    const angular = 0.15 * speed * (0.8 + seed.jitter * 0.5)
    const theta = seed.phase + t * angular
    out.set(
      Math.cos(theta) * seed.radius,
      -0.4 + seed.height * 0.6 + Math.sin(t * 0.8 + seed.phase * 2) * 0.6,
      Math.sin(theta) * seed.radius,
    )
    return out
  }

  // wave：沿 +X 推进，y 起伏 + z 侧向摆动
  const travel = seed.phase * WAVE_SPAN + t * speed * 3.4
  const x = ((travel % WAVE_SPAN) + WAVE_SPAN) % WAVE_SPAN - WAVE_SPAN / 2
  out.set(
    x,
    -0.9 + Math.sin(x * 0.32 + t * 1.15 + seed.phase) * 0.55 + seed.height * 0.35,
    -5 + Math.sin(seed.phase * 5.1) * 6.5 + Math.cos(t * 0.5 + seed.phase) * 1.1,
  )
  return out
}

/**
 * 鱼群（InstancedMesh + CPU 运动）。
 *
 * instruction/02 的实现顺序建议：先 10 条验证朝向 → 再加扰动 → 再上 Boids。
 * 本「地基」先交付 orbit/wave 两种确定性运动 + 实例化绘制管线，
 * 目的有二：① 验证朝向计算（鱼头朝向速度方向）；② 建立「CPU 算位置 → 写 instanceMatrix」
 * 这条后续 Boids 可直接复用的管线。Boids（分离/对齐/聚合 + 空间分桶）见深化路线。
 */
export default function FishSchool({ active, count, speed, mode }: FishSchoolProps) {
  const seeds = useMemo(
    () => Array.from({ length: Math.max(count, 1) }, (_, i) => seedFor(i)),
    [count],
  )

  const mesh = useMemo(() => {
    // 低多边形鱼：五点锥体（头朝 +Z），压扁 28% 形成侧扁体形
    const geometry = new THREE.ConeGeometry(0.13, 0.5, 5)
    geometry.rotateX(Math.PI / 2)
    geometry.scale(1, 0.72, 1)

    const material = new THREE.MeshStandardMaterial({
      color: '#a8e3f0',
      roughness: 0.45,
      metalness: 0.2,
      emissive: new THREE.Color('#123c4a'),
      emissiveIntensity: 0.5,
    })

    const instanced = new THREE.InstancedMesh(
      geometry,
      material,
      Math.max(count, 1),
    )
    instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    instanced.frustumCulled = false
    instanced.count = count
    return instanced
  }, [count])

  useEffect(
    () => () => {
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
      mesh.dispose()
    },
    [mesh],
  )

  const tmp = useMemo(
    () => ({
      dummy: new THREE.Object3D(),
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
    }),
    [],
  )

  useFrame((state) => {
    if (!active || count === 0) return
    const t = state.clock.elapsedTime

    for (let i = 0; i < count; i += 1) {
      const seed = seeds[i]
      positionAt(seed, t, speed, mode, tmp.a)
      // 用「前方 0.08s 的位置」求速度方向，避免为每种模式再推一次解析导数
      positionAt(seed, t + 0.08, speed, mode, tmp.b)
      tmp.dir.copy(tmp.b).sub(tmp.a).normalize()
      tmp.quat.setFromUnitVectors(FORWARD, tmp.dir)

      tmp.dummy.position.copy(tmp.a)
      tmp.dummy.quaternion.copy(tmp.quat)
      tmp.dummy.scale.setScalar(seed.scale)
      tmp.dummy.updateMatrix()
      mesh.setMatrixAt(i, tmp.dummy.matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
  })

  if (count === 0) return null
  return <primitive object={mesh} />
}
