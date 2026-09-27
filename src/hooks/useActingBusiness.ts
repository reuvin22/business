import { useState } from 'react'
import { listMyBusinesses } from '../api/businesses'
import { useLoad } from './useLoad'

const STORAGE_KEY = 'actingBusinessId'

function readSaved() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

/**
 * When you visit another business in the directory, you act as one of YOUR businesses
 * (to order, message, or connect). The choice is remembered in this browser.
 */
export function useActingBusiness() {
  const { data: myBusinesses = [] } = useLoad(listMyBusinesses, [])
  const [savedId, setSavedId] = useState(readSaved)

  const acting = myBusinesses.find((b) => b.id === savedId) ?? myBusinesses[0] ?? null

  function choose(id: string) {
    setSavedId(id)
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // storage can be blocked (e.g. private mode); the choice then lasts until reload
    }
  }

  return { myBusinesses, acting, choose }
}
