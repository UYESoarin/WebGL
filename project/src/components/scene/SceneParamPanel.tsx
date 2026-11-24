import type {
  SceneParamSchema,
  SceneParamValue,
  SceneParamValues,
} from '../../types/scene'

interface SceneParamPanelProps {
  title: string
  schema: SceneParamSchema[]
  values: SceneParamValues
  onChange: (key: string, value: SceneParamValue) => void
  onReset: () => void
  onClose: () => void
}

/**
 * 场景参数面板（plan §20 / instruction/02 §6）。
 * 只做「schema → 控件」的通用渲染，不关心具体场景参数含义；
 * 参数含义/取值建议写在各场景 config.ts 的 description 里。
 */
export default function SceneParamPanel({
  title,
  schema,
  values,
  onChange,
  onReset,
  onClose,
}: SceneParamPanelProps) {
  if (schema.length === 0) {
    return (
      <aside className="param-panel">
        <header className="param-panel-head">
          <span>{title} · 参数</span>
          <button className="param-panel-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>
        <p className="param-panel-empty">该场景尚未定义可调参数。</p>
      </aside>
    )
  }

  let lastGroup: string | undefined

  return (
    <aside className="param-panel">
      <header className="param-panel-head">
        <span>{title} · 参数</span>
        <div className="param-panel-actions">
          <button onClick={onReset}>重置</button>
          <button onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
      </header>

      {schema.map((param) => {
        const group = param.group
        const heading = group && group !== lastGroup ? group : null
        lastGroup = group
        const value = values[param.key] ?? param.default

        return (
          <div key={param.key}>
            {heading && <div className="param-group">{heading}</div>}
            <label className="param-row">
              <span className="param-label" title={param.description}>
                {param.label}
              </span>

              {param.type === 'slider' && (
                <>
                  <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.step ?? 1}
                    value={Number(value)}
                    onChange={(e) => onChange(param.key, Number(e.target.value))}
                  />
                  <span className="param-value">
                    {Number(value).toFixed(
                      (param.step ?? 1) < 1 ? 2 : 0,
                    )}
                    {param.unit ?? ''}
                  </span>
                </>
              )}

              {param.type === 'toggle' && (
                <input
                  className="param-toggle"
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => onChange(param.key, e.target.checked)}
                />
              )}

              {param.type === 'select' && (
                <select
                  value={String(value)}
                  onChange={(e) => onChange(param.key, e.target.value)}
                >
                  {(param.options ?? []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
            </label>
            {param.description && (
              <p className="param-desc">{param.description}</p>
            )}
          </div>
        )
      })}
    </aside>
  )
}
