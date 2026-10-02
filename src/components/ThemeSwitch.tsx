import { useState } from 'react'
import { cx } from '../styles'
import { getThemeChoice, setThemeChoice, type ThemeChoice } from '../utils/theme'

const CHOICES: { value: ThemeChoice; label: string; icon: React.ReactNode }[] = [
  {
    value: 'light',
    label: 'Light',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Night',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
  {
    value: 'auto',
    label: 'Auto',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="2" y="4" width="20" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
]

/** Light, Night, or Auto (follow the device). Made for the dark sidebar / header. */
export default function ThemeSwitch({ showLabels = false }: { showLabels?: boolean }) {
  const [choice, setChoice] = useState(getThemeChoice)

  return (
    <div className="flex rounded-lg bg-side-hover p-0.5" role="radiogroup" aria-label="Theme">
      {CHOICES.map((c) => (
        <button
          key={c.value}
          type="button"
          role="radio"
          aria-checked={choice === c.value}
          title={c.value === 'auto' ? 'Auto: follow this device' : `${c.label} mode`}
          onClick={() => {
            setThemeChoice(c.value)
            setChoice(c.value)
          }}
          className={cx(
            'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border-0 px-2 py-1.5 text-[0.8rem] font-semibold',
            choice === c.value ? 'bg-side-active text-lime' : 'bg-transparent text-side-text hover:text-side-heading',
          )}
        >
          {c.icon}
          {showLabels && c.label}
          {!showLabels && <span className="sr-only">{c.label}</span>}
        </button>
      ))}
    </div>
  )
}
