import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { CityBuilding } from '../layout'

interface BuildingsProps {
  buildings: readonly CityBuilding[]
  neonIntensity: number
}

const WINDOW_GLSL = /* glsl */ `
float cityHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`

/**
 * 建筑群（instruction/04 §1–§2）。
 *
 * 一个 InstancedMesh 承载全部楼体（共享 1×1×1 盒），窗户通过材质补丁在片元里生成：
 *   - vBuildingUv 取几何自带 uv（每个面 0..1）；
 *   - 缩放成 cols×rows 网格，网格内留边得到窗洞；
 *   - 每扇窗用 hash(格子 + 建筑种子) 决定是否点亮，冷暖色随机；
 *   - 结果加到 totalEmissiveRadiance（受 uNeonIntensity 控制）。
 * 这样不需要逐楼贴图，也不会因楼高不同导致窗户被拉伸失真。
 */
export default function Buildings({ buildings, neonIntensity }: BuildingsProps) {
  const neonUniform = useMemo(() => ({ value: neonIntensity }), [])

  const mesh = useMemo(() => {
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    // 以底面为原点，便于用实例矩阵直接按高度缩放
    geometry.translate(0, 0.5, 0)

    const count = Math.max(buildings.length, 1)
    const seeds = new Float32Array(count)
    buildings.forEach((b, i) => {
      seeds[i] = b.seed
    })
    geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1))

    const material = new THREE.MeshStandardMaterial({
      color: '#2a3444',
      roughness: 0.72,
      metalness: 0.35,
    })
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uNeonIntensity = neonUniform
      shader.vertexShader =
        /* glsl */ `
attribute float aSeed;
varying float vSeed;
varying vec2 vBuildingUv;
` + shader.vertexShader.replace(
          '#include <begin_vertex>',
          /* glsl */ `#include <begin_vertex>
  vSeed = aSeed;
  vBuildingUv = uv;`,
        )
      shader.fragmentShader =
        /* glsl */ `
uniform float uNeonIntensity;
varying float vSeed;
varying vec2 vBuildingUv;
${WINDOW_GLSL}
` + shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          /* glsl */ `#include <emissivemap_fragment>
  vec2 grid = vec2(5.0 + floor(vSeed * 3.0), 7.0 + floor(vSeed * 7.0));
  vec2 uvScaled = vBuildingUv * grid;
  vec2 cell = fract(uvScaled);
  vec2 cellId = floor(uvScaled);
  float win = step(0.16, cell.x) * step(cell.x, 0.84) * step(0.2, cell.y) * step(cell.y, 0.8);
  float lit = step(0.52, cityHash(cellId + vSeed * 61.7));
  vec3 winColor = mix(vec3(0.42, 0.86, 1.0), vec3(1.0, 0.66, 0.32), step(0.45, cityHash(cellId.yx + vSeed * 13.3)));
  totalEmissiveRadiance += win * lit * winColor * uNeonIntensity * 1.5;`,
        )
    }
    material.customProgramCacheKey = () => 'view-city-windows-v1'

    const instanced = new THREE.InstancedMesh(geometry, material, count)
    instanced.instanceMatrix.setUsage(THREE.StaticDrawUsage)
    instanced.frustumCulled = false

    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    buildings.forEach((b, i) => {
      dummy.position.set(b.x, 0, b.z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(b.width, b.height, b.depth)
      dummy.updateMatrix()
      instanced.setMatrixAt(i, dummy.matrix)
      // 立面基色微差
      color.setHSL(0.58, 0.12, 0.1 + b.seed * 0.07)
      instanced.setColorAt(i, color)
    })
    instanced.count = buildings.length
    instanced.instanceMatrix.needsUpdate = true
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true
    return instanced
  }, [buildings, neonUniform])

  useEffect(() => {
    neonUniform.value = neonIntensity
  }, [neonUniform, neonIntensity])

  useEffect(
    () => () => {
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
      mesh.dispose()
    },
    [mesh],
  )

  return <primitive object={mesh} />
}
