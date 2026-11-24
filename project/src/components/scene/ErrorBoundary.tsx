import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  onExit?: () => void
}

interface ErrorBoundaryState {
  error: Error | null
}

/** 捕获场景渲染/运行时错误，避免白屏卡死（plan §17.6） */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[VIEW] 场景渲染错误：', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-screen">
          <h2>场景渲染出错</h2>
          <p className="error-summary">{this.state.error.message}</p>
          <div className="error-actions">
            <button
              className="hud-btn"
              onClick={() => this.setState({ error: null })}
            >
              重试
            </button>
            {this.props.onExit && (
              <button className="hud-btn" onClick={this.props.onExit}>
                返回选择页
              </button>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
