import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32, sampleHeight, sampleSlope, riverCenter, TERRAIN_SIZE } from '../terrain'

interface TreesProps {
  active: boolean
  density: number
  windStrength: number
  windSpeed: number
}

const BASE_COUNT = 190

/**
 * 树（instruction/03 §2 的分布规则 + §3 风动）。
 * 分布不是均匀撒点：坡度、海拔、河谷留白、密度噪声共同决定。
 * 树干与树冠分两个 InstancedMesh（材质不同），树冠用高度加权风动。
 */
export default function Trees({ active, density, windStrength, windSpeed }: TreesProps) {
  const windUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWindStrength: { value: windStrength },
      uWindSpeed: { value: windSpeed },
    }),
    [],
  )

  const { trunks, canopies } = useMemo(() => {
    const count = Math.max(0, Math.round(BASE_COUNT * density))
    const rand = mulberry32(20240521)

    const trunkGeometry = new THREE.CylinderGeometry(0.13, 0.26, 2.6, 6)
    trunkGeometry.translate(0, 1.3, 0)
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#4b3a2c', roughness: 0.95 })

    // 树冠：三层锥体堆叠（base 在 y=0，便于风动按高度加权）
    const canopyGeometry = new THREE.ConeGeometry(1.35, 3.4, 8)
    canopyGeometry.translate(0, 1.7, 0)
    const canopyMaterial = new THREE.MeshStandardMaterial({
      color: '#3f6b35',
      roughness: 0.85,
      flatShading: true,
    })
    canopyMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = windUniforms.uTime
      shader.uniforms.uWindStrength = windUniforms.uWindStrength
      shader.uniforms.uWindSpeed = windUniforms.uWindSpeed
      shader.vertexShader =
        /* glsl */ `
uniform float uTime;
uniform float uWindStrength;
uniform float uWindSpeed;
` + shader.vertexShader.replace(
          '#include <begin_vertex>',
          /* glsl */ `#include <begin_vertex>
  #ifdef USE_INSTANCING
    vec2 instXZ = instanceMatrix[3].xz;
  #else
    vec2 instXZ = vec2(0.0);
  #endif
  float canopyW = smoothstep(0.0, 3.2, position.y);
  float phase = dot(instXZ, vec2(0.2, 0.16)) - uTime * uWindSpeed * 1.15;
  float sway = sin(phase) * 0.7 + sin(phase * 1.9 + 0.7) * 0.3;
  transformed.x += sway * canopyW * uWindStrength * 0.16;
  transformed.z += sway * canopyW * uWindStrength * 0.11;`,
        )
    }

    const trunkMesh = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, Math.max(count, 1))
    const canopyMesh = new THREE.InstancedMesh(canopyGeometry, canopyMaterial, Math.max(count, 1))
    trunkMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)
    canopyMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)
    trunkMesh.frustumCulled = false
    canopyMesh.frustumCulled = false

    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    let written = 0
    const half = TERRAIN_SIZE / 2

    for (let i = 0; i < count; i += 1) {
      const x = (rand() * 2 - 1) * (half - 8)
      const z = (rand() * 2 - 1) * (half - 8)
      if (sampleSlope(x, z) > 0.34) continue
      if (Math.abs(z - riverCenter(x)) < 7) continue
      const y = sampleHeight(x, z)
      if (y < 0.5 || y > 15) continue
      // 密度掩码：森林成片而不是均匀铺满
      const patch = Math.sin(x * 0.09) * Math.cos(z * 0.08) + Math.sin((x + z) * 0.05)
      if (patch < 0.1) continue
      if (rand() > 0.72) continue

      const s = 0.72 + rand() * 0.75
      dummy.position.set(x, y - 0.1, z)
      dummy.rotation.set(0, rand() * Math.PI * 2, 0)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      trunkMesh.setMatrixAt(written, dummy.matrix)

      dummy.position.y = y + 2.55 * s
      dummy.updateMatrix()
      canopyMesh.setMatrixAt(written, dummy.matrix)
      // 少量色差，避免「一片同色」
      color.setHSL(0.27 + rand() * 0.05, 0.34 + rand() * 0.14, 0.24 + rand() * 0.09)
      canopyMesh.setColorAt(written, color)
      written += 1
    }

    trunkMesh.count = written
    canopyMesh.count = written
    trunkMesh.instanceMatrix.needsUpdate = true
    canopyMesh.instanceMatrix.needsUpdate = true
    if (canopyMesh.instanceColor) canopyMesh.instanceColor.needsUpdate = true
    return { trunks: trunkMesh, canopies: canopyMesh }
  }, [density, windUniforms])

  useEffect(() => {
    windUniforms.uWindStrength.value = windStrength
  }, [windUniforms, windStrength])

  useEffect(() => {
    windUniforms.uWindSpeed.value = windSpeed
  }, [windUniforms, windSpeed])

  useEffect(
    () => () => {
      for (const mesh of [trunks, canopies]) {
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
        mesh.dispose()
      }
    },
    [trunks, canopies],
  )

  useFrame((_, delta) => {
    if (!active) return
    windUniforms.uTime.value += Math.min(delta, 0.05)
  })

  return (
    <group>
      <primitive object={trunks} />
      <primitive object={canopies} />
    </group>
  )
}
