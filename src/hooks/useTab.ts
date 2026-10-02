import { useSearchParams } from 'react-router-dom'

/** group: tabs with a group are shown by category (a row of categories, then that category's tabs). */
export type Tab = { key: string; label: string; group?: string }

/** The selected tab is kept in the URL (?tab=...), so links and the back button work. */
export function useTab(tabs: Tab[]) {
  const [params, setParams] = useSearchParams()
  const current = tabs.find((t) => t.key === params.get('tab'))?.key ?? tabs[0].key
  const setTab = (key: string) => setParams((p) => ({ ...Object.fromEntries(p), tab: key }), { replace: true })
  return [current, setTab] as const
}
