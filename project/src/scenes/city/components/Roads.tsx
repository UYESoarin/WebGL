import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { AVENUE_HALF, AVENUE_LENGTH } from '../layout'

interface RoadsProps {
  active: boolean
  neonIntensity: number
}

/**
 * 地面与主干道（instruction/04 §1 / §4）。
 * 地面用低 roughness + 较高 metalness 近似「雨后湿地」；车道线通过材质补丁的
 * 自发光项绘制（不需要贴图），并带流动脉冲。
 */
export default function Roads({ active, neonIntensity }: RoadsProps) {
  const neonUniform = useMemo(() => ({ value: neonIntensity }), [])
  const timeUniform = useMemo(() => ({ value: 0 }), [])

  const groundGeometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(260, 260)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])

  const avenue = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(AVENUE_HALF * 2, AVENUE_LENGTH)
    geometry.rotateX(-Math.PI / 2)

    const material = new THREE.MeshStandardMaterial({
      color: '#10141c',
      roughness: 0.24,
      metalness: 0.55,
    })
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uNeon = neonUniform
      shader.uniforms.uTime = timeUniform
      shader.vertexShader =
        /* glsl */ `
varying vec2 vRoadUv;
` + shader.vertexShader.replace(
          '#include <begin_vertex>',
          /* glsl */ `#include <begin_vertex>
  vRoadUv = uv;`,
        )
      shader.fragmentShader =
        /* glsl */ `
uniform float uNeon;
uniform float uTime;
varying vec2 vRoadUv;
` + shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          /* glsl */ `#include <emissivemap_fragment>
  float center = smoothstep(0.012, 0.0, abs(vRoadUv.x - 0.5));
  float dash = step(0.62, fract(vRoadUv.y * 46.0));
  float edge = smoothstep(0.014, 0.0, abs(abs(vRoadUv.x - 0.5) - 0.455));
  float pulse = 0.62 + 0.38 * sin(vRoadUv.y * 26.0 - uTime * 2.2);
  vec3 laneGlow = vec3(0.35, 0.9, 1.0) * (center * dash * 1.5 + edge * 1.1) * pulse;
  totalEmissiveRadiance += laneGlow * uNeon;`,
        )
    }
    material.customProgramCacheKey = () => 'view-city-road-v1'

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = 0.02
    return mesh
  }, [neonUniform, timeUniform])

  useEffect(() => {
    neonUniform.value = neonIntensity
  }, [neonUniform, neonIntensity])

  useEffect(
    () => () => {
      groundGeometry.dispose()
      avenue.geometry.dispose()
      ;(avenue.material as THREE.Material).dispose()
    },
    [groundGeometry, avenue],
  )

  useFrame((_, delta) => {
    if (!active) return
    timeUniform.value += Math.min(delta, 0.05)
  })

  return (
    <group>
      <mesh geometry={groundGeometry} position={[0, -0.02, 0]}>
        <meshStandardMaterial color="#0a0d13" roughness={0.3} metalness={0.5} />
      </mesh>
      <primitive object={avenue} />
    </group>
  )
}
