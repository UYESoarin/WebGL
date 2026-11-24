import { useSceneController } from '../../app/sceneController'

/** 加载失败反馈：错误摘要 + 重试 + 返回（FR-12 / T13） */
export default function ErrorScreen() {
  const error = useSceneController((s) => s.error)
  const retry = useSceneController((s) => s.retry)
  const exitToSelector = useSceneController((s) => s.exitToSelector)

  return (
    <div className="error-screen">
      <h2>场景加载失败</h2>
      <p className="error-summary">{error?.message ?? '未知错误'}</p>
      <div className="error-actions">
        <button className="hud-btn" onClick={retry}>
          重试
        </button>
        <button className="hud-btn" onClick={exitToSelector}>
          返回选择页
        </button>
      </div>
    </div>
  )
}
