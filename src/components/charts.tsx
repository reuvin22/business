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

/** Like niceTicks, but also goes below zero when some values are negative (e.g. a day with a loss). */
function niceRange(values: number[], count = 6) {
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  if (min >= 0) return niceTicks(max, count)
  const span = (max - min) / (count - 1)
  const mag = 10 ** Math.floor(Math.log10(span))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= span) ?? span
  const ticks = []
  for (let t = Math.floor(min / step) * step; t <= Math.ceil(max / step) * step + step / 2; t += step) {
    ticks.push(Math.round(t * 100) / 100)
  }
  return ticks
}

const fmtTick = (n: number) =>
  Math.abs(n) >= 1000 ? `${(n / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k` : n.toLocaleString()

const PAD = { top: 12, right: 8, bottom: 28, left: 40 }

// The hover tooltip, placed above the point it describes
const TIP_CLASS =
  'pointer-events-none absolute z-5 flex -translate-x-1/2 -translate-y-[calc(100%+12px)] flex-col items-center gap-0.5 whitespace-nowrap rounded-md border border-line bg-surface px-3.5 py-2 shadow-lg [&>span]:text-[0.72rem] [&>span]:text-muted [&>strong]:text-[0.9rem] [&>strong]:text-heading [&>strong]:tabular-nums'

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
    <div className="inline-flex rounded-md bg-chip p-0.75" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={`cursor-pointer rounded-[5px] border-0 px-3.5 py-1.25 text-[0.78rem] font-medium ${value === o.value ? 'bg-side text-white' : 'bg-transparent text-muted hover:text-heading'}`}
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
    <div className="relative w-full [&>svg]:block [&>svg]:overflow-visible" ref={ref} style={{ height }} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={data.map((d) => `${d.tipLabel}: ${format(d.value)}`).join(', ')}>
          <defs>
            <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="var(--color-bar)" />
              <rect width="2.5" height="6" fill="var(--color-bar-stripe)" />
            </pattern>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line className="stroke-grid" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
              <text className="fill-muted font-sans text-[11px]" x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end">
                {fmtTick(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = PAD.left + slot * i + slot / 2
            const h = (d.value / top) * plotH
            return (
              <g key={i} onMouseEnter={() => setHover(i)}>
                <rect className="fill-transparent" x={cx - slot / 2} y={PAD.top} width={slot} height={plotH} />
                <rect className="fill-track" x={cx - barW / 2} y={PAD.top} width={barW} height={plotH} rx={2} />
                {d.value > 0 && (
                  <rect x={cx - barW / 2} y={y(d.value)} width={barW} height={h} fill={`url(#${patternId})`} rx={2} />
                )}
                {i % labelEvery === 0 && (
                  <text className="fill-muted font-sans text-[11px]" x={cx} y={height - 8} textAnchor="middle">
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
          className={TIP_CLASS}
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
  const ticks = niceRange(data.map((d) => d.value))
  const top = ticks[ticks.length - 1]
  const bottom = ticks[0] // 0, or below 0 when a value is negative
  const plotW = Math.max(width - PAD.left - PAD.right - 16, 0)
  const plotH = height - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + 8 + (data.length > 1 ? (plotW * i) / (data.length - 1) : plotW / 2)
  const y = (v: number) => PAD.top + plotH - ((v - bottom) / (top - bottom)) * plotH
  const pts = data.map((d, i) => [x(i), y(d.value)] as [number, number])
  const line = smoothPath(pts)
  // The shaded area reaches down (or up) to the zero line
  const area = pts.length ? `${line} L${pts[pts.length - 1][0]},${y(0)} L${pts[0][0]},${y(0)} Z` : ''

  function onMove(e: MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left + PAD.left
    let best = 0
    for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i][0] - px) < Math.abs(pts[best][0] - px)) best = i
    setHover(best)
  }

  return (
    <div className="relative w-full [&>svg]:block [&>svg]:overflow-visible" ref={ref} style={{ height }} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={data.map((d) => `${d.tipLabel}: ${format(d.value)}`).join(', ')}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-chart-line)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--color-chart-line)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line className="stroke-grid" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
              <text className="fill-muted font-sans text-[11px]" x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end">
                {fmtTick(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) =>
            i % labelEvery === 0 ? (
              <text key={i} className="fill-muted font-sans text-[11px]" x={x(i)} y={height - 8} textAnchor="middle">
                {d.label}
              </text>
            ) : null,
          )}
          <path d={area} fill={`url(#${gradientId})`} />
          <path d={line} fill="none" stroke="var(--color-chart-line)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {hover !== null && pts[hover] && (
            <>
              <line className="stroke-grid" x1={pts[hover][0]} x2={pts[hover][0]} y1={PAD.top} y2={PAD.top + plotH} />
              <circle cx={pts[hover][0]} cy={pts[hover][1]} r={5} className="fill-surface stroke-chart-line stroke-[2.5]" />
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
        <div className={TIP_CLASS} style={{ left: pts[hover][0], top: pts[hover][1] }}>
          <span>{data[hover].tipLabel}</span>
          <strong>{format(data[hover].value)}</strong>
        </div>
      )}
    </div>
  )
}
