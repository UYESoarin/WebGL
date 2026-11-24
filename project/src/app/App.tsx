import { useSceneController } from './sceneController'
import { useSceneRouter } from './useSceneRouter'
import SceneView from './SceneView'
import HomePage from '../components/home/HomePage'
import RuntimeErrorOverlay from '../components/RuntimeErrorOverlay'

/**
 * 顶层视图切换：
 * - sceneId === null → 首页（Landing / 场景选择）
 * - sceneId 有值 → 场景视口（唯一共享 Canvas + HUD）
 */
export default function App() {
  const sceneId = useSceneController((s) => s.sceneId)

  // 场景状态机与浏览器 URL 双向同步：进入场景改地址栏、前进/后退可导航
  useSceneRouter()

  return (
    <>
      {sceneId === null ? <HomePage /> : <SceneView />}
      <RuntimeErrorOverlay />
    </>
  )
}
