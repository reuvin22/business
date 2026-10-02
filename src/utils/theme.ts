// Night mode. The person picks Light, Dark, or Auto (follow the device); the choice is kept in this
// browser. index.html applies it before the page draws (no flash); tailwind.css has the dark colors,
// used while <html data-theme="dark">.

export type ThemeChoice = 'light' | 'dark' | 'auto'

const KEY = 'theme'
const deviceIsDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

export function getThemeChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(KEY)
    return saved === 'light' || saved === 'dark' ? saved : 'auto'
  } catch {
    return 'auto' // storage blocked (e.g. a private window): follow the device
  }
}

/** Shows the chosen theme now. */
export function applyTheme(choice: ThemeChoice = getThemeChoice()) {
  const dark = choice === 'dark' || (choice === 'auto' && deviceIsDark())
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export function setThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === 'auto') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, choice)
  } catch {
    // Not saved, but still applied for this visit
  }
  applyTheme(choice)
}

/** In Auto, follow the device when it switches between light and dark (e.g. at sunset). */
export function followDeviceTheme() {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getThemeChoice() === 'auto') applyTheme('auto')
  })
}
