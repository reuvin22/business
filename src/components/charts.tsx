import { useEffect, useId, useRef, useState, type MouseEvent } from 'react'

export type Point = { label: string; tipLabel: string; value: number }

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/** Rounds the axis max up to a clean number and returns evenly spaced ticks. */
function niceTicks(max: number, count = 6) {
  if (max <= 0) return [0, 1, 2, 3, 4, 5]
  const raw = max / (count - 1)
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  return Array.from({ length: count }, (_, i) => Math.round(i * step * 100) / 100)
}

const fmtTick = (n: number) =>
  n >= 1000 ? `${(n / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k` : n.toLocaleString()

const PAD = { top: 12, right: 8, bottom: 28, left: 40 }

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={value === o.value ? 'active' : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Striped columns on a light track, like the reference "per day" chart. */
export function ColumnChart({
  data,
  height = 280,
  format = (n: number) => n.toLocaleString(),
  labelEvery = 1,
}: {
  data: Point[]
  height?: number
  format?: (n: number) => string
  labelEvery?: number
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const patternId = useId()
  const ticks = niceTicks(Math.max(...data.map((d) => d.value), 0))
  const top = ticks[ticks.length - 1]
  const plotW = Math.max(width - PAD.left - PAD.right, 0)
  const plotH = height - PAD.top - PAD.bottom
  const slot = data.length ? plotW / data.length : 0
  const barW = Math.min(24, Math.max(slot * 0.5, 3))
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH

  return (
    <div className="chart" ref={ref} style={{ height }} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={data.map((d) => `${d.tipLabel}: ${format(d.value)}`).join(', ')}>
          <defs>
            <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="var(--bar)" />
              <rect width="2.5" height="6" fill="var(--bar-stripe)" />
            </pattern>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line className="grid-line" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
              <text className="axis-text" x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end">
                {fmtTick(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = PAD.left + slot * i + slot / 2
            const h = (d.value / top) * plotH
            return (
              <g key={i} onMouseEnter={() => setHover(i)}>
                <rect className="col-hit" x={cx - slot / 2} y={PAD.top} width={slot} height={plotH} />
                <rect className="col-track" x={cx - barW / 2} y={PAD.top} width={barW} height={plotH} rx={2} />
                {d.value > 0 && (
                  <rect x={cx - barW / 2} y={y(d.value)} width={barW} height={h} fill={`url(#${patternId})`} rx={2} />
                )}
                {i % labelEvery === 0 && (
                  <text className="axis-text" x={cx} y={height - 8} textAnchor="middle">
                    {d.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <div
          className="chart-tip"
          style={{ left: PAD.left + slot * hover + slot / 2, top: y(data[hover].value) }}
        >
          <span>{data[hover].tipLabel}</span>
          <strong>{format(data[hover].value)}</strong>
        </div>
      )}
    </div>
  )
}

/** Monotone cubic path through the points, so the curve never overshoots below zero. */
function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : ''
  const n = pts.length
  const dx = pts.slice(1).map((p, i) => p[0] - pts[i][0])
  const slope = pts.slice(1).map((p, i) => (p[1] - pts[i][1]) / dx[i])
  const m = pts.map((_, i) => {
    if (i === 0) return slope[0]
    if (i === n - 1) return slope[n - 2]
    return slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2
  })
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / slope[i]
    const b = m[i + 1] / slope[i]
    const s = a * a + b * b
    if (s > 9) {
      const t = 3 / Math.sqrt(s)
      m[i] = t * a * slope[i]
      m[i + 1] = t * b * slope[i]
    }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3
    d += ` C${pts[i][0] + h},${pts[i][1] + m[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - m[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`
  }
  return d
}

/** Smooth line with a soft gradient wash and a hover dot + tooltip. */
export function AreaChart({
  data,
  height = 280,
  format = (n: number) => n.toLocaleString(),
  labelEvery = 1,
}: {
  data: Point[]
  height?: number
  format?: (n: number) => string
  labelEvery?: number
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const gradientId = useId()
  const ticks = niceTicks(Math.max(...data.map((d) => d.value), 0))
  const top = ticks[ticks.length - 1]
  const plotW = Math.max(width - PAD.left - PAD.right - 16, 0)
  const plotH = height - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + 8 + (data.length > 1 ? (plotW * i) / (data.length - 1) : plotW / 2)
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH
  const pts = data.map((d, i) => [x(i), y(d.value)] as [number, number])
  const line = smoothPath(pts)
  const area = pts.length
    ? `${line} L${pts[pts.length - 1][0]},${PAD.top + plotH} L${pts[0][0]},${PAD.top + plotH} Z`
    : ''

  function onMove(e: MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left + PAD.left
    let best = 0
    for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i][0] - px) < Math.abs(pts[best][0] - px)) best = i
    setHover(best)
  }

  return (
    <div className="chart" ref={ref} style={{ height }} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={data.map((d) => `${d.tipLabel}: ${format(d.value)}`).join(', ')}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--line)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--line)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line className="grid-line" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
              <text className="axis-text" x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end">
                {fmtTick(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) =>
            i % labelEvery === 0 ? (
              <text key={i} className="axis-text" x={x(i)} y={height - 8} textAnchor="middle">
                {d.label}
              </text>
            ) : null,
          )}
          <path d={area} fill={`url(#${gradientId})`} />
          <path d={line} fill="none" stroke="var(--line)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {hover !== null && pts[hover] && (
            <>
              <line className="hover-line" x1={pts[hover][0]} x2={pts[hover][0]} y1={PAD.top} y2={PAD.top + plotH} />
              <circle cx={pts[hover][0]} cy={pts[hover][1]} r={5} className="hover-dot" />
            </>
          )}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={Math.max(width - PAD.left - PAD.right, 0)}
            height={plotH}
            fill="transparent"
            onMouseMove={onMove}
          />
        </svg>
      )}
      {hover !== null && data[hover] && (
        <div className="chart-tip" style={{ left: pts[hover][0], top: pts[hover][1] }}>
          <span>{data[hover].tipLabel}</span>
          <strong>{format(data[hover].value)}</strong>
        </div>
      )}
    </div>
  )
}
