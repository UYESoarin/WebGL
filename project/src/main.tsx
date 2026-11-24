import { createRoot } from 'react-dom/client'
import App from './app/App'
import './styles/global.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('找不到挂载节点 #root')
}

// 注意：不包裹 StrictMode，避免开发环境下 R3F Canvas 与场景生命周期
// 被双重执行（load/dispose 各触发两次），保证状态机行为可预测。
createRoot(container).render(<App />)
