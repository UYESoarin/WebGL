import { useEffect } from 'react'
import { useSceneController } from './sceneController'
import { isSceneId } from './sceneRegistry'
import type { SceneId } from '../types/scene'

/** 匹配 /scene/:id 路径 */
const SCENE_PATH = /^\/scene\/([a-z-]+)$/

/** 从当前地址栏解析场景 id；非法或首页路径返回 null */
function sceneIdFromPath(): SceneId | null {
  const match = window.location.pathname.match(SCENE_PATH)
  if (!match) return null
  const id = match[1]
  return isSceneId(id) ? id : null
}

/**
 * 场景 URL 路由（轻量 History API，不引入 react-router）：
 *
 * 1. 深链接 —— 首次加载 /scene/:id 时自动进入对应场景（可刷新/分享）。
 * 2. store → URL —— sceneId 变化时 pushState 同步地址栏，进入场景后地址变为 /scene/:id。
 * 3. URL → store —— 浏览器前进/后退（popstate）时反向驱动状态机，
 *    从而修复「返回键直接退出根页面、且地址栏无变化」的问题。
 */
export function useSceneRouter() {
  const sceneId = useSceneController((s) => s.sceneId)
  const enterScene = useSceneController((s) => s.enterScene)
  const exitToSelector = useSceneController((s) => s.exitToSelector)

  // 1. 深链接初始化：仅挂载时执行一次。
  //    enterScene 为 zustand 稳定 action，不放入依赖数组。
  useEffect(() => {
    const id = sceneIdFromPath()
    if (id) enterScene(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2. store → URL：sceneId 变化时同步地址栏（进入→/scene/:id，退出→/）
  useEffect(() => {
    const target = sceneId ? `/scene/${sceneId}` : '/'
    if (window.location.pathname !== target) {
      window.history.pushState({ sceneId }, '', target)
    }
  }, [sceneId])

  // 3. URL → store：浏览器前进/后退
  useEffect(() => {
    const onPop = () => {
      const id = sceneIdFromPath()
      if (id) enterScene(id)
      else exitToSelector()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [enterScene, exitToSelector])
}
