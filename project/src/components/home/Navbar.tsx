export default function Navbar() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">VIEW</span>
        <span className="navbar-name">场景实时渲染实践</span>
      </div>
      <nav className="navbar-links">
        <button className="nav-link" onClick={() => scrollTo('explore')}>
          Explore
        </button>
        <button className="nav-link" onClick={() => scrollTo('about')}>
          About
        </button>
      </nav>
    </header>
  )
}
