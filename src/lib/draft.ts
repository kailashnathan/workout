import type { Draft } from './types'

const KEY = 'workout-draft'

export function loadDraft(): Draft | null {
  const raw = localStorage.getItem(KEY)
  return raw ? (JSON.parse(raw) as Draft) : null
}

export const saveDraft = (d: Draft) => localStorage.setItem(KEY, JSON.stringify(d))

export const clearDraft = () => localStorage.removeItem(KEY)
