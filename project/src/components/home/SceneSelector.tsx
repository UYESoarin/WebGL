import { useState } from 'react'
import { sceneList } from '../../app/sceneRegistry'
import { useSceneController } from '../../app/sceneController'
import SceneCard from './SceneCard'

export default function SceneSelector() {
  const enterScene = useSceneController((s) => s.enterScene)
  const [index, setIndex] = useState(0)
  const total = sceneList.length
  const current = sceneList[index]

  const prev = () => setIndex((i) => (i - 1 + total) % total)
  const next = () => setIndex((i) => (i + 1) % total)

  return (
    <section id="explore" className="scene-selector">
      <div className="section-heading">
        <h2>选择你的场景</h2>
        <p>四个主题站点，一次实时渲染之旅</p>
      </div>

      <div className="scene-track">
        <button className="track-arrow" onClick={prev} aria-label="上一个场景">
          ‹
        </button>
        <SceneCard meta={current} onEnter={enterScene} />
        <button className="track-arrow" onClick={next} aria-label="下一个场景">
          ›
        </button>
      </div>

      <div className="scene-route" role="tablist">
        {sceneList.map((s, i) => (
          <button
            key={s.id}
            className={`route-dot${i === index ? ' active' : ''}`}
            style={i === index ? { backgroundColor: s.accent } : undefined}
            onClick={() => setIndex(i)}
            aria-label={`第 ${i + 1} 站：${s.title}`}
          />
        ))}
      </div>
    </section>
  )
}
