import type { SceneId, SceneMeta } from '../../types/scene'

interface SceneCardProps {
  meta: SceneMeta
  onEnter: (id: SceneId) => void
}

export default function SceneCard({ meta, onEnter }: SceneCardProps) {
  return (
    <article className="scene-card">
      <div className="scene-card-thumb">
        <img src={meta.thumbnail} alt={`${meta.title} 缩略图`} />
        <span className="scene-card-order" style={{ backgroundColor: meta.accent }}>
          0{meta.order + 1}
        </span>
      </div>
      <div className="scene-card-body">
        <h3 className="scene-card-title">{meta.title}</h3>
        <p className="scene-card-subtitle">{meta.subtitle}</p>
        <p className="scene-card-desc">{meta.description}</p>
        <button
          className="scene-card-enter"
          style={{ borderColor: meta.accent, color: meta.accent }}
          onClick={() => onEnter(meta.id)}
        >
          进入场景 →
        </button>
      </div>
    </article>
  )
}
