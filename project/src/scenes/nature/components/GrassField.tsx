import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32, sampleHeight, sampleSlope, riverCenter } from '../terrain'

interface GrassFieldProps {
  active: boolean
  /** 植被密度倍率 0–1.5 */
  density: number
  /** 风动幅度 0–2 */
  windStrength: number
  /** 风速 0–3 */
  windSpeed: number
}

const BASE_COUNT = 4200
const SPREAD = 62

/** 两片交叉四边形组成一株草，基部在 y=0（便于按高度做风动权重） */
function createBladeGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array([
    // 朝 +Z 的一片
    -0.08, 0, 0, 0.08, 0, 0, 0.035, 0.95, 0, -0.035, 0.95, 0,
    // 旋转 90° 的一片
    0, 0, -0.08, 0, 0, 0.08, 0, 0.95, 0.035, 0, 0.95, -0.035,
  ])
  const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1])
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7])
  geometry.computeVertexNormals()
  return geometry
}

/**
 * 草地（instruction/03 §3 风动 Shader 的最小实现）。
 * 顶点位移按「叶片高度」加权：根部几乎不动、叶尖摆幅最大；
 * 相位由实例位置与世界风向点积决定，因此每株草不同步。
 */
export default function GrassField({ active, density, windStrength, windSpeed }: GrassFieldProps) {
  const windUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWindStrength: { value: windStrength },
      uWindSpeed: { value: windSpeed },
    }),
    [],
  )

  const mesh = useMemo(() => {
    const count = Math.max(0, Math.round(BASE_COUNT * density))
    const geometry = createBladeGeometry()
    const material = new THREE.MeshStandardMaterial({
      color: '#5d8a45',
      roughness: 0.88,
      metalness: 0,
      side: THREE.DoubleSide,
    })

    material.onBeforeCompile = (shader) => {
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
  float windW = smoothstep(0.0, 0.95, position.y);
  float phase = dot(instXZ, vec2(0.32, 0.24)) - uTime * uWindSpeed * 1.6;
  float sway = sin(phase) * 0.62 + sin(phase * 1.7 + 1.3) * 0.38;
  transformed.x += sway * windW * uWindStrength * 0.22;
  transformed.z += sway * windW * uWindStrength * 0.14;`,
        )
    }

    const instanced = new THREE.InstancedMesh(geometry, material, Math.max(count, 1))
    instanced.instanceMatrix.setUsage(THREE.StaticDrawUsage)
    instanced.frustumCulled = false

    const rand = mulberry32(1777)
    const dummy = new THREE.Object3D()
    let written = 0
    for (let i = 0; i < count; i += 1) {
      const x = (rand() * 2 - 1) * SPREAD
      const z = (rand() * 2 - 1) * SPREAD
      if (Math.hypot(x, z) > SPREAD) continue
      if (sampleSlope(x, z) > 0.55) continue
      if (Math.abs(z - riverCenter(x)) < 5) continue
      const y = sampleHeight(x, z)
      if (y > 16) continue
      dummy.position.set(x, y - 0.03, z)
      dummy.rotation.set(0, rand() * Math.PI * 2, 0)
      const s = 0.7 + rand() * 0.8
      dummy.scale.set(s, s * (0.8 + rand() * 0.5), s)
      dummy.updateMatrix()
      instanced.setMatrixAt(written, dummy.matrix)
      written += 1
    }
    instanced.count = written
    instanced.instanceMatrix.needsUpdate = true
    return instanced
  }, [density, windUniforms])

  useEffect(() => {
    windUniforms.uWindStrength.value = windStrength
  }, [windUniforms, windStrength])

  useEffect(() => {
    windUniforms.uWindSpeed.value = windSpeed
  }, [windUniforms, windSpeed])

  useEffect(
    () => () => {
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
      mesh.dispose()
    },
    [mesh],
  )

  useFrame((_, delta) => {
    if (!active) return
    windUniforms.uTime.value += Math.min(delta, 0.05)
  })

  return <primitive object={mesh} />
}
