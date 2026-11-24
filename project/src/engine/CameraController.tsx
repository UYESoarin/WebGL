import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { MOUSE } from 'three'
import type { ElementRef } from 'react'
import type { SceneCameraConfig } from '../types/scene'
import { orbitControlsHandle } from './camera'

type OrbitControlsImpl = ElementRef<typeof OrbitControls>

interface CameraControllerProps {
  config: SceneCameraConfig
}

/**
 * Blender 风格相机（instruction/01 §3）：
 * 左键旋转、中键平移、右键平移（阻止 context menu 在 SceneView 层处理）、滚轮缩放。
 * 每个场景的默认 position/target/距离限制来自各自 config。
 */
export default function CameraController({ config }: CameraControllerProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const camera = useThree((s) => s.camera)

  // 场景切换时应用默认 position + target
  useEffect(() => {
    camera.position.set(...config.position)
    if (controlsRef.current) {
      controlsRef.current.target.set(...config.target)
      controlsRef.current.update()
    }
  }, [camera, config])

  // 暴露实例给 DOM 层（resetCamera）。controls 实例在 Canvas 生命周期内稳定。
  useEffect(() => {
    orbitControlsHandle.current = controlsRef.current
    return () => {
      orbitControlsHandle.current = null
    }
  }, [])

  // 阻尼需要逐帧 update（plan §5.6 相机不重复创建；此处只更新实例）
  useFrame(() => {
    controlsRef.current?.update()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      mouseButtons={{
        LEFT: MOUSE.ROTATE,
        MIDDLE: MOUSE.PAN,
        RIGHT: MOUSE.PAN,
      }}
      minDistance={config.minDistance}
      maxDistance={config.maxDistance}
      minPolarAngle={config.minPolarAngle ?? 0}
      maxPolarAngle={config.maxPolarAngle ?? Math.PI}
    />
  )
}
