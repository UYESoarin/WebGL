import Navbar from './Navbar'
import SceneSelector from './SceneSelector'

export default function HomePage() {
  const scrollToExplore = () => {
    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="home-page">
      <Navbar />

      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">VIEW</h1>
          <p className="hero-tagline">Visual Interactive Environment Worlds</p>
          <p className="hero-desc">
            实时三维场景渲染实践：水下、自然、城市与太空四个主题，共享统一视口与交互。
          </p>
          <button className="hero-cta" onClick={scrollToExplore}>
            开始探索
          </button>
        </div>
      </section>

      <SceneSelector />

      <section id="about" className="about">
        <h2>关于项目</h2>
        <p>
          VIEW 是一个运行在桌面浏览器中的实时三维场景渲染与交互展示系统，旨在以分阶段方式掌握关键效果的算法、
          渲染原理与 Shader 实现。四个场景共享公共视口与基础设施，内部效果独立实现。
        </p>
        <ul className="about-stack">
          <li>React + TypeScript + Vite</li>
          <li>Three.js + React Three Fiber + Drei</li>
          <li>Zustand 状态管理</li>
        </ul>
        <p className="about-note">
          资源来源：Phase 1 全部为程序化占位资源，无外部资产（详见 docs/ASSET_CREDITS.md）。
        </p>
      </section>

      <footer className="footer">VIEW · WebGL 实时渲染实践 · 课程大作业</footer>
    </div>
  )
}
