import { useEffect, useState } from 'react'
import { sceneRegistry, sceneList } from '../../app/sceneRegistry'
import { useSceneController } from '../../app/sceneController'
import { resetCamera } from '../../engine/camera'

export default function HUD() {
  const sceneId = useSceneController((s) => s.sceneId)
  const enterScene = useSceneController((s) => s.enterScene)
  const exitToSelector = useSceneController((s) => s.exitToSelector)
  const [switcherOpen, setSwitcherOpen] = useState(false)

  const meta = sceneId ? sceneRegistry[sceneId] : null

  // R 键重置视角（输入焦点在表单时不触发）
  useEffect(() => {
    if (!meta) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'r') return
      const tag = (e.target as HTMLElement | null)?.tagName ?? ''
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      resetCamera(meta.camera)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [meta])

  if (!sceneId || !meta) return null

  return (
    <div className="hud">
      <div className="hud-top">
        <button className="hud-btn" onClick={exitToSelector}>
          ← 返回
        </button>
        <div className="hud-title">
          <span className="hud-title-main">{meta.title}</span>
          <span className="hud-title-sub">{meta.subtitle}</span>
        </div>
        <div className="hud-top-right">
          <button
            className="hud-btn"
            onClick={() => setSwitcherOpen((v) => !v)}
          >
            切换场景
          </button>
          <button className="hud-btn" onClick={() => resetCamera(meta.camera)}>
            重置视角 (R)
          </button>
        </div>
      </div>

      {switcherOpen && (
        <div className="hud-switcher">
          {sceneList.map((s) => (
            <button
              key={s.id}
              className={`hud-switcher-item${s.id === sceneId ? ' active' : ''}`}
              onClick={() => {
                enterScene(s.id)
                setSwitcherOpen(false)
              }}
            >
              {s.title}
            </button>
          ))}
        </div>
      )}

      <div className="hud-hint">
        <span>左键拖动：旋转</span>
        <span>中键/右键拖动：平移</span>
        <span>滚轮：缩放</span>
        <span>R：重置视角</span>
      </div>
    </div>
  )
}
