import { sceneRegistry } from '../../app/sceneRegistry'
import { useSceneController } from '../../app/sceneController'

/** 加载反馈：不确定进度动画，不伪造百分比（instruction/01 §5） */
export default function LoadingScreen() {
  const sceneId = useSceneController((s) => s.sceneId)
  const title = sceneId ? sceneRegistry[sceneId].title : ''

  return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p className="loading-title">{title ? `正在进入 ${title}` : '正在加载场景'}</p>
      <p className="loading-note">场景模块加载中…</p>
    </div>
  )
}
