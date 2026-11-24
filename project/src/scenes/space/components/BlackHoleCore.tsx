import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * 黑洞核心（instruction/05 §1）：暗色球体（事件视界）+ 细亮环（光子环近似）。
 * 关键点是「中心必须保持黑」——任何发光都放在环上，不要放在球面。
 */
export default function BlackHoleCore() {
  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(2.1, 48, 32), [])
  const ringGeometry = useMemo(() => new THREE.TorusGeometry(2.3, 0.045, 10, 160), [])

  return (
    <group rotation={[0.22, 0, 0.12]}>
      <mesh geometry={sphereGeometry} renderOrder={1}>
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh geometry={ringGeometry} renderOrder={3}>
        <meshBasicMaterial
          color="#ffd9a8"
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
