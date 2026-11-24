import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface TrafficProps {
  active: boolean
  speed: number
  count: number
}

const VEHICLE_COUNT = 26

interface Lane {
  curve: THREE.CatmullRomCurve3
  /** 行驶方向（+1 沿 z 正向，-1 反向） */
  dir: number
  offset: number
}

function createLanes(): Lane[] {
  const mk = (x: number, dir: number, offset: number): Lane => {
    const points = [
      new THREE.Vector3(x, 0.32, -76),
      new THREE.Vector3(x + 0.6, 0.32, -24),
      new THREE.Vector3(x - 0.5, 0.32, 22),
      new THREE.Vector3(x, 0.32, 76),
    ]
    return { curve: new THREE.CatmullRomCurve3(points), dir, offset }
  }
  return [mk(-3.4, 1, 0), mk(-1.5, 1, 0.42), mk(1.6, -1, 0.18), mk(3.5, -1, 0.63)]
}

/**
 * 动态交通（instruction/04 §3）：车辆沿 CatmullRomCurve3 前进，
 * 位置用 getPointAt(t)（弧长参数，避免速度忽快忽慢），朝向用切线。
 * 车身与灯条分两个 InstancedMesh，灯条用加法混合做「车灯」。
 */
export default function Traffic({ active, speed, count }: TrafficProps) {
  const lanes = useMemo(createLanes, [])

  const { bodies, lights, phase } = useMemo(() => {
    const bodyGeometry = new THREE.BoxGeometry(1.1, 0.5, 2.6)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: '#161b26',
      roughness: 0.35,
      metalness: 0.7,
    })
    const bodyMesh = new THREE.InstancedMesh(bodyGeometry, bodyMaterial, VEHICLE_COUNT)
    bodyMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)
    bodyMesh.frustumCulled = false

    const lightGeometry = new THREE.BoxGeometry(0.9, 0.12, 0.12)
    const lightMaterial = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const lightMesh = new THREE.InstancedMesh(lightGeometry, lightMaterial, VEHICLE_COUNT * 2)
    lightMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)
    lightMesh.frustumCulled = false

    const color = new THREE.Color()
    for (let i = 0; i < VEHICLE_COUNT; i += 1) {
      const warm = i % 3 !== 0
      color.set(warm ? '#ffd7a1' : '#9fe4ff')
      lightMesh.setColorAt(i * 2, color)
      color.set(warm ? '#ff5a3c' : '#ff7a5c')
      lightMesh.setColorAt(i * 2 + 1, color)
    }
    if (lightMesh.instanceColor) lightMesh.instanceColor.needsUpdate = true

    const phase = Array.from({ length: VEHICLE_COUNT }, (_, i) => {
      const lane = lanes[i % lanes.length]
      return (lane.offset + i / VEHICLE_COUNT) % 1
    })
    return { bodies: bodyMesh, lights: lightMesh, phase }
  }, [lanes])

  useEffect(
    () => () => {
      for (const mesh of [bodies, lights]) {
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
        mesh.dispose()
      }
    },
    [bodies, lights],
  )

  const tmp = useMemo(
    () => ({
      dummy: new THREE.Object3D(),
      point: new THREE.Vector3(),
      tangent: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      forward: new THREE.Vector3(0, 0, 1),
    }),
    [],
  )

  useFrame((_, delta) => {
    if (!active || count <= 0) return
    const dt = Math.min(delta, 0.05)
    const visible = Math.min(count, VEHICLE_COUNT)

    for (let i = 0; i < VEHICLE_COUNT; i += 1) {
      const lane = lanes[i % lanes.length]
      phase[i] = (phase[i] + dt * speed * 0.055 * (0.85 + (i % 5) * 0.06)) % 1
      const t = phase[i]

      lane.curve.getPointAt(t, tmp.point)
      lane.curve.getTangentAt(t, tmp.tangent).multiplyScalar(lane.dir)
      tmp.quat.setFromUnitVectors(tmp.forward, tmp.tangent.clone().normalize())

      tmp.dummy.position.copy(tmp.point)
      tmp.dummy.quaternion.copy(tmp.quat)
      tmp.dummy.scale.setScalar(i < visible ? 1 : 0)
      tmp.dummy.updateMatrix()
      bodies.setMatrixAt(i, tmp.dummy.matrix)

      // 车灯：车身前后各一根灯条
      const offset = 1.32
      for (let k = 0; k < 2; k += 1) {
        const p = tmp.point.clone().add(tmp.tangent.clone().multiplyScalar(k === 0 ? offset : -offset))
        tmp.dummy.position.copy(p)
        tmp.dummy.quaternion.copy(tmp.quat)
        tmp.dummy.scale.setScalar(i < visible ? 1 : 0)
        tmp.dummy.updateMatrix()
        lights.setMatrixAt(i * 2 + k, tmp.dummy.matrix)
      }
    }

    bodies.instanceMatrix.needsUpdate = true
    lights.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <primitive object={bodies} />
      <primitive object={lights} />
    </group>
  )
}
