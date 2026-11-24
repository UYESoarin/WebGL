import { useEffect, useState } from 'react'

interface RuntimeError {
  message: string
  source?: string
  line?: number
  stack?: string
}

/**
 * 开发模式运行时错误上屏：捕获 window 'error' 与 'unhandledrejection'，
 * 在页面右上角渲染最近 5 条错误，便于在没有无头浏览器时肉眼诊断黑屏等问题。
 * 生产构建（import.meta.env.DEV === false）不注册任何监听，零运行时开销。
 */
export default function RuntimeErrorOverlay() {
  const [errors, setErrors] = useState<RuntimeError[]>([])

  useEffect(() => {
    if (!import.meta.env.DEV) return

    const push = (err: RuntimeError) =>
      setErrors((prev) => [...prev, err].slice(-5))

    const onError = (e: ErrorEvent) =>
      push({
        message: e.message,
        source: e.filename,
        line: e.lineno,
        stack: e.error instanceof Error ? e.error.stack : undefined,
      })

    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason
      push({
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  if (errors.length === 0) return null

  return (
    <div className="runtime-error-overlay" role="alert">
      <button
        type="button"
        className="runtime-error-close"
        onClick={() => setErrors([])}
        aria-label="关闭错误面板"
      >
        ✕
      </button>
      <strong>运行时错误（开发模式）</strong>
      {errors.map((err, i) => (
        <pre key={i}>
          {err.message}
          {err.source ? `\n@ ${err.source}${err.line ? `:${err.line}` : ''}` : ''}
          {err.stack ? `\n${err.stack}` : ''}
        </pre>
      ))}
    </div>
  )
}
